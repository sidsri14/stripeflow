import { prisma } from './utils/prisma.js';
import { sendAlertEmail } from './services/email.service.js';
import pLimit from 'p-limit';
import pino from 'pino';
import http from 'http';
import https from 'https';
import type { Monitor } from '@prisma/client';
import { validateUrlForSSRF, createSafeAgent } from './utils/security.js';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

const CHECK_INTERVAL_MS = 10 * 1000; 
const limit = pLimit(10); // Phase 3: Bounded concurrency
let isShuttingDown = false;
let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

// Phase 2: TOCTOU-safe fetch using Node http agent that re-validates IP at connect time
const fetchWithAgent = (url: string, method: string): Promise<{ status: number; ok: boolean }> => {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const isHttps = parsed.protocol === 'https:';
    const agent = createSafeAgent(isHttps ? 'https' : 'http');
    const lib = isHttps ? https : http;

    const req = lib.request(
      { hostname: parsed.hostname, port: parsed.port || (isHttps ? 443 : 80), path: parsed.pathname + parsed.search, method, agent },
      (res) => {
        res.resume(); // drain body
        const status = res.statusCode ?? 0;
        resolve({ status, ok: status >= 200 && status < 300 });
      }
    );
    req.setTimeout(10000, () => { req.destroy(new Error('Request timeout')); });
    req.on('error', reject);
    req.end();
  });
};

// Phase 3: Retry wrapper with exponential backoff
const fetchWithRetry = async (url: string, method: string, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetchWithAgent(url, method);
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw new Error("Unreachable");
};

const checkMonitors = async () => {
  if (isShuttingDown) return;
  
  logger.info('Ticking... querying database for due monitors.');
  
  try {
    // Phase 3: Query ONLY due monitors using Raw Postgres SQL for massive indexing efficiency
    const dueMonitors = await prisma.$queryRaw<Monitor[]>`
      SELECT * FROM "Monitor" 
      WHERE "lastCheckedAt" IS NULL 
      OR "lastCheckedAt" + ("interval" * interval '1 second') <= NOW()
    `;

    if (dueMonitors.length === 0) {
      logger.debug('No monitors due for checking.');
    } else {
      logger.info(`Dispatched ${dueMonitors.length} monitor(s) to concurrent queue.`);
      
      // Phase 3: Execute with bounded p-limit
      await Promise.all(
        dueMonitors.map(monitor => limit(() => executeCheck(monitor)))
      );
    }
  } catch (error) {
    logger.error({ err: error }, 'Failed to process monitor batch');
  } finally {
    if (!isShuttingDown) {
      // Recursive timeout prevents overlapping ticks
      timeoutHandle = setTimeout(checkMonitors, CHECK_INTERVAL_MS);
    }
  }
};

const executeCheck = async (monitor: Monitor) => {
  const startTime = performance.now();
  let statusCode: number | null = null;
  let status = 'DOWN';

  logger.debug(`[Queue Executing] Checking ${monitor.url} [${monitor.method}]`);

  let errorMsg: string | null = null;

  try {
    // Phase 5: SSRF Check
    const isSafe = await validateUrlForSSRF(monitor.url);
    if (!isSafe) {
      throw new Error("SSRF Security Violation: Target URL resolves to a forbidden private/local IP range.");
    }

    const response = await fetchWithRetry(monitor.url, monitor.method);
    statusCode = response.status;
    if (response.ok) {
      status = 'UP';
    } else {
      errorMsg = `HTTP Error: ${statusCode}`;
    }
  } catch (error) {
    errorMsg = (error as Error).message;
    logger.warn(`Monitor ${monitor.url} check failed: ${errorMsg}`);
    status = 'DOWN';
  }

  const previousStatus = monitor.status;
  
  // Phase 5: Failure Count & Strike Policy (Cooldown)
  const isCurrentlyUp = status === 'UP';
  const currentFailureCount = (monitor as any).failureCount ?? 0;
  let nextFailureCount = isCurrentlyUp ? 0 : currentFailureCount + 1;
  
  // Transition to DOWN only after 3 consecutive failures
  const effectiveStatus = (nextFailureCount >= 3) ? 'DOWN' : (isCurrentlyUp ? 'UP' : previousStatus);
  const statusChanged = previousStatus !== effectiveStatus;
  const isEffectivelyDown = effectiveStatus === 'DOWN';

  // Update physical monitor status state using raw SQL to include failureCount
  await prisma.$executeRaw`
    UPDATE "Monitor" 
    SET "status" = ${effectiveStatus}, 
        "failureCount" = ${nextFailureCount}, 
        "lastCheckedAt" = NOW() 
    WHERE "id" = ${monitor.id}
  `;

  // Phase 6: Incident Management & Alerting
  if (isEffectivelyDown || statusChanged) {
    if (isEffectivelyDown) {
      // 1. Open new incident if none exists already for this monitor
      const existingOpen = await prisma.incident.findFirst({
        where: { monitorId: monitor.id, resolvedAt: null }
      });
      
      if (!existingOpen) {
        logger.info(`Opening new incident for ${monitor.url}`);
        await prisma.incident.create({
          data: {
            monitorId: monitor.id,
            cause: errorMsg || 'Unknown failure',
            startedAt: new Date()
          }
        });
      }

      // 2. Alert orchestration (Anti-Spam / Flapping Protection)
      const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
      const recentAlert = await prisma.alert.findFirst({
        where: {
          monitorId: monitor.id,
          sentAt: { gte: fifteenMinsAgo }
        }
      });

      if (!recentAlert) {
        logger.info(`Triggering active DOWN alert for ${monitor.url}`);
        await prisma.alert.create({
          data: { monitorId: monitor.id, type: 'EMAIL' }
        });

        // Fetch user context for email
        const projectWithUser = await prisma.project.findUnique({
          where: { id: monitor.projectId },
          include: { user: true }
        });

        if (projectWithUser?.user?.email) {
          await sendAlertEmail(projectWithUser.user.email, monitor.url, status, statusCode);
        }
      } else {
        logger.info(`Suppressed duplicate DOWN alert for ${monitor.url} (15m Cooldown active)`);
      }
    } else if (effectiveStatus === 'UP' && statusChanged) {
      // Resolve any open incidents
      const openIncidents: any[] = await prisma.$queryRaw`
        SELECT id, "startedAt" FROM "Incident" 
        WHERE "monitorId" = ${monitor.id} AND "resolvedAt" IS NULL
      `;

      for (const inc of openIncidents) {
        const resolvedAt = new Date();
        const startedAt = new Date(inc.startedAt);
        const durationSecs = Math.floor((resolvedAt.getTime() - startedAt.getTime()) / 1000);
        
        await prisma.$executeRaw`
          UPDATE "Incident" 
          SET "resolvedAt" = ${resolvedAt}, "durationSecs" = ${durationSecs}
          WHERE id = ${inc.id}
        `;
        logger.info(`Resolved incident ${inc.id} for monitor ${monitor.id}`);
      }
    }
  }
};

const startWorker = () => {
  logger.info('Starting Resilient Background Monitor Worker...');
  checkMonitors();
};

startWorker();

// Phase 3: Graceful Shutdown Hook
const shutdown = async (signal: string) => {
  logger.info(`\nReceived ${signal}. Gracefully draining queue and shutting down...`);
  isShuttingDown = true;
  if (timeoutHandle) clearTimeout(timeoutHandle);
  
  await prisma.$disconnect();
  logger.info('Worker disconnected safely. Exiting.');
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

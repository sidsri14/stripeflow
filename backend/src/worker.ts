import { prisma } from './utils/prisma';
import { sendAlertEmail } from './services/email.service';

interface MonitorWithProject {
  id: string;
  url: string;
  method: string;
  interval: number;
  status: string;
  lastCheckedAt?: Date;
  project: {
    user: {
      email: string;
    };
  };
}

const CHECK_INTERVAL_MS = 10 * 1000; // Worker ticks every 10 seconds to check for due monitors

const checkMonitors = async () => {
  console.log(`[Worker] Ticking... checking for monitors to test.`);
  try {
    const monitors = await prisma.monitor.findMany({
      include: {
        project: {
          include: { user: true }
        }
      }
    });

    const now = new Date();

    for (const monitor of monitors) {
      if (!monitor.lastCheckedAt || (now.getTime() - monitor.lastCheckedAt.getTime()) >= (monitor.interval * 1000)) {
        await executeCheck(monitor);
      }
    }
  } catch (error) {
    console.error(`[Worker Error] Failed to fetch monitors:`, error);
  }
};

const executeCheck = async (monitor: MonitorWithProject) => {
  const startTime = performance.now();
  let statusCode: number | null = null;
  let status = 'DOWN';

  console.log(`[Worker] Checking monitor ${monitor.url}...`);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(monitor.url, {
      method: monitor.method,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    statusCode = response.status;
    if (response.ok) {
      status = 'UP';
    }
  } catch (error) {
    status = 'DOWN';
  }

  const responseTime = Math.round(performance.now() - startTime);

  // Determine if status changed
  const previousStatus = monitor.status;
  const statusChanged = previousStatus !== 'PENDING' && previousStatus !== status;

  // Log the result
  await prisma.log.create({
    data: {
      monitorId: monitor.id,
      statusCode,
      responseTime,
      status,
    }
  });

  // Update monitor status
  await prisma.monitor.update({
    where: { id: monitor.id },
    data: {
      status,
      lastCheckedAt: new Date(),
    }
  });

  // Alert logic
  if (statusChanged && status === 'DOWN') {
    await prisma.alert.create({
      data: {
        monitorId: monitor.id,
        type: 'EMAIL',
      }
    });
    
    const userEmail = monitor.project.user.email;
    await sendAlertEmail(userEmail, monitor.url, status, statusCode);
  }
};

const startWorker = () => {
  console.log('[Worker] Starting background monitor worker...');
  setInterval(checkMonitors, CHECK_INTERVAL_MS);
};

startWorker();

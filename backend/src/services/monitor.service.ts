import crypto from 'crypto';
import { prisma } from '../utils/prisma.js';
import { validateUrlForSSRF } from '../utils/security.js';

export class MonitorService {
  private static async getDefaultProject(userId: string) {
    let project = await prisma.project.findFirst({ where: { userId } });
    if (!project) {
      project = await prisma.project.create({
        data: {
          userId,
          name: 'Default Project',
        },
      });
    }
    return project;
  }

  static async createMonitor(userId: string, data: { name: string; url: string; method: string; interval: number }) {
    const { name, url, method, interval } = data;

    // Phase 5: SSD/SSRF Protection - Block local/private URLs at API level
    const isSafe = await validateUrlForSSRF(url);
    if (!isSafe) {
      const error = new Error('SSRF Security Violation: Local/Private URLs are not allowed.');
      (error as any).status = 403;
      throw error;
    }

    const project = await this.getDefaultProject(userId);

    // Phase 4: Enforce Quotas (Max 20 limitation)
    const count = await prisma.monitor.count({
      where: { projectId: project.id }
    });

    if (count >= 20) {
      const error = new Error('You have reached the maximum limit of 20 monitors');
      (error as any).status = 403;
      throw error;
    }

    const monitor = await prisma.monitor.create({
      data: {
        id: crypto.randomUUID(),
        projectId: project.id,
        name: name || url,
        url,
        method,
        interval: Number(interval),
        status: 'UP',
        failureCount: 0,
      },
    });

    return monitor;
  }

  static async getMonitors(userId: string) {
    const project = await this.getDefaultProject(userId);
    const monitors = await prisma.monitor.findMany({
      where: { projectId: project.id },
      orderBy: { id: 'desc' },
    });

    const uptimeStats: any[] = await prisma.$queryRaw`
      SELECT 
        l."monitorId",
        COUNT(*)::float as total,
        COUNT(CASE WHEN l."status" = 'UP' THEN 1 END)::float as up
      FROM "Log" l
      JOIN "Monitor" m ON l."monitorId" = m.id
      WHERE m."projectId" = ${project.id}
      AND l."createdAt" > (NOW() - INTERVAL '30 days')
      GROUP BY l."monitorId"
    `;

    // Map stats back to monitors
    return monitors.map((monitor) => {
      const stats = uptimeStats.find((s) => s.monitorId === monitor.id);
      const uptime30d = stats && stats.total > 0 
        ? parseFloat(((stats.up / stats.total) * 100).toFixed(2)) 
        : 100; // Default to 100% if no logs

      return { 
        id: monitor.id,
        name: monitor.name || monitor.url,
        url: monitor.url,
        method: monitor.method,
        interval: monitor.interval,
        status: monitor.status,
        lastCheckedAt: monitor.lastCheckedAt,
        uptime30d 
      };
    });
  }

  static async getMonitorById(userId: string, monitorId: string) {
    const project = await this.getDefaultProject(userId);

    const monitor = await prisma.monitor.findFirst({
      where: { id: monitorId, projectId: project.id },
      include: {
        logs: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });

    if (!monitor) {
      const error = new Error('Monitor not found');
      (error as any).status = 404;
      throw error;
    }

    // Include incidents via raw SQL
    const incidents: any[] = await prisma.$queryRaw`
      SELECT * FROM "Incident" 
      WHERE "monitorId" = ${monitorId} 
      ORDER BY "startedAt" DESC 
      LIMIT 20
    `;

    // Calculate 30-day uptime for this specific monitor
    const uptimeResult: any[] = await prisma.$queryRaw`
      SELECT 
        COUNT(*)::float as total,
        COUNT(CASE WHEN "status" = 'UP' THEN 1 END)::float as up
      FROM "Log"
      WHERE "monitorId" = ${monitorId} AND "createdAt" > (NOW() - INTERVAL '30 days')
    `;

    const stats = uptimeResult[0];
    const uptime30d = stats && stats.total > 0 
      ? parseFloat(((stats.up / stats.total) * 100).toFixed(2)) 
      : 100;

    return { ...monitor, incidents, uptime30d };
  }

  static async deleteMonitor(userId: string, monitorId: string) {
    const project = await this.getDefaultProject(userId);

    const monitor = await prisma.monitor.findFirst({
      where: { id: monitorId, projectId: project.id },
    });

    if (!monitor) {
      const error = new Error('Monitor not found');
      (error as any).status = 404;
      throw error;
    }

    // Execute deletion atomically to prevent race condition locks from the background worker
    // Phase 6: Include cleanup of incidents
    await prisma.$transaction([
      prisma.log.deleteMany({ where: { monitorId } }),
      prisma.alert.deleteMany({ where: { monitorId } }),
      prisma.incident.deleteMany({ where: { monitorId } }),
      prisma.monitor.delete({ where: { id: monitorId } })
    ]);

    return true;
  }
}

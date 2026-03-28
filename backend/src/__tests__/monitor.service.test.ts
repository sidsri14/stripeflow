import { mock, describe, test, expect, beforeEach } from 'bun:test';

// ─── Module mocks (hoisted) ──────────────────────────────────────────────────
// NOTE: We do NOT mock security.js — its SSRF functions are tested separately
// in security.test.ts and Bun shares the module registry across files.
// Instead we use real IP literals so SSRF validation behaves deterministically:
//   - http://8.8.8.8/  → public IP, passes SSRF (no DNS needed)
//   - http://127.0.0.1/ → loopback, blocked by SSRF

const mockMonitorFindFirst = mock(async (): Promise<any> => null);
const mockMonitorFindMany = mock(async (): Promise<any> => []);
const mockMonitorCreate = mock(async (args: any): Promise<any> => ({ id: 'monitor-uuid-1', ...args.data }));
const mockMonitorUpdate = mock(async (args: any): Promise<any> => ({ id: args.where.id, ...args.data }));
const mockMonitorDelete = mock(async (): Promise<any> => null);
const mockMonitorCount = mock(async (): Promise<any> => 0);
const mockProjectFindFirst = mock(async (): Promise<any> => null);
const mockProjectCreate = mock(async (_args?: any): Promise<any> => ({ id: 'project-uuid-1', userId: 'user-1', name: 'Default Project' }));
const mockLogGroupBy = mock(async (): Promise<any> => []);
const mockAuditCreate = mock(async (): Promise<any> => null);

mock.module('../utils/prisma.js', () => ({
  prisma: {
    monitor: {
      findFirst: mockMonitorFindFirst,
      findMany: mockMonitorFindMany,
      create: mockMonitorCreate,
      update: mockMonitorUpdate,
      delete: mockMonitorDelete,
      count: mockMonitorCount,
    },
    project: {
      findFirst: mockProjectFindFirst,
      create: mockProjectCreate,
    },
    log: {
      groupBy: mockLogGroupBy,
    },
    auditLog: {
      create: mockAuditCreate,
    },
  },
}));

// ─── Imports ─────────────────────────────────────────────────────────────────

import { MonitorService } from '../services/monitor.service.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const userId = 'user-uuid-1';
const monitorId = 'monitor-uuid-1';
const projectId = 'project-uuid-1';

// Public IP literal — passes SSRF without DNS resolution
const SAFE_URL = 'http://8.8.8.8/health';
// Loopback IP — blocked by SSRF isPrivateIP check (no DNS needed)
const PRIVATE_URL = 'http://127.0.0.1/secret';

// ─── createMonitor ────────────────────────────────────────────────────────────

describe('MonitorService.createMonitor', () => {
  beforeEach(() => {
    mockProjectFindFirst.mockImplementation(async () => ({ id: projectId, userId, name: 'Default Project' }));
    mockMonitorCount.mockImplementation(async () => 0);
    mockMonitorCreate.mockImplementation(async (args: any) => ({ id: monitorId, ...args.data }));
    mockAuditCreate.mockImplementation(async () => null);
  });

  test('creates and returns a monitor for a safe public URL', async () => {
    const monitor = await MonitorService.createMonitor(userId, {
      name: 'My API',
      url: SAFE_URL,
      method: 'GET',
      interval: 60,
    });

    expect(monitor).toBeDefined();
    expect(monitor.url).toBe(SAFE_URL);
    expect(monitor.method).toBe('GET');
  });

  test('creates a default project when user has none', async () => {
    mockProjectFindFirst.mockImplementation(async () => null);
    let projectCreated = false;
    mockProjectCreate.mockImplementation(async (args: any) => {
      projectCreated = true;
      return { id: projectId, ...args.data };
    });

    await MonitorService.createMonitor(userId, {
      name: 'Test',
      url: SAFE_URL,
      method: 'GET',
      interval: 60,
    });

    expect(projectCreated).toBe(true);
  });

  test('throws 403 when monitor limit (20) is reached', async () => {
    mockMonitorCount.mockImplementation(async () => 20);

    await expect(
      MonitorService.createMonitor(userId, {
        name: 'Extra',
        url: SAFE_URL,
        method: 'GET',
        interval: 60,
      })
    ).rejects.toMatchObject({ message: 'Monitor limit reached (Max 20)', status: 403 });
  });

  test('throws 403 when URL is a private/loopback IP (real SSRF check)', async () => {
    await expect(
      MonitorService.createMonitor(userId, {
        name: 'SSRF',
        url: PRIVATE_URL,
        method: 'GET',
        interval: 60,
      })
    ).rejects.toMatchObject({ status: 403 });
  });
});

// ─── getMonitors ──────────────────────────────────────────────────────────────

describe('MonitorService.getMonitors', () => {
  beforeEach(() => {
    mockMonitorFindMany.mockImplementation(async () => [
      { id: monitorId, name: 'My API', url: SAFE_URL, method: 'GET', interval: 60, status: 'UP', lastCheckedAt: null, failureCount: 0, maintenanceUntil: null },
    ]);
    mockLogGroupBy.mockImplementation(async () => [
      { monitorId, status: 'UP', _count: 90 },
      { monitorId, status: 'DOWN', _count: 10 },
    ]);
  });

  test('returns monitors with uptime30d field', async () => {
    const monitors = await MonitorService.getMonitors(userId);
    expect(monitors.length).toBe(1);
    expect(monitors[0]).toHaveProperty('uptime30d');
  });

  test('calculates uptime correctly (90 UP / 100 total = 90%)', async () => {
    const monitors = await MonitorService.getMonitors(userId);
    expect(monitors[0]!.uptime30d).toBe(90);
  });

  test('returns 100% uptime when no logs exist', async () => {
    mockLogGroupBy.mockImplementation(async () => []);
    const monitors = await MonitorService.getMonitors(userId);
    expect(monitors[0]!.uptime30d).toBe(100);
  });
});

// ─── updateMonitor ────────────────────────────────────────────────────────────

describe('MonitorService.updateMonitor', () => {
  beforeEach(() => {
    mockMonitorFindFirst.mockImplementation(async () => ({ id: monitorId, url: SAFE_URL, projectId }));
    mockMonitorUpdate.mockImplementation(async (args: any) => ({ id: monitorId, url: SAFE_URL, ...args.data }));
    mockAuditCreate.mockImplementation(async () => null);
  });

  test('updates and returns the monitor', async () => {
    const updated = await MonitorService.updateMonitor(userId, monitorId, { name: 'New Name' });
    expect(updated).toBeDefined();
  });

  test('throws 404 when monitor not found or not owned', async () => {
    mockMonitorFindFirst.mockImplementation(async () => null);

    await expect(
      MonitorService.updateMonitor(userId, 'other-monitor', { name: 'X' })
    ).rejects.toMatchObject({ status: 404 });
  });

  test('throws 403 when new URL is a private IP (real SSRF check)', async () => {
    await expect(
      MonitorService.updateMonitor(userId, monitorId, { url: PRIVATE_URL })
    ).rejects.toMatchObject({ status: 403 });
  });
});

// ─── deleteMonitor ────────────────────────────────────────────────────────────

describe('MonitorService.deleteMonitor', () => {
  beforeEach(() => {
    mockMonitorFindFirst.mockImplementation(async () => ({ id: monitorId, url: SAFE_URL, projectId }));
    mockMonitorDelete.mockImplementation(async () => null);
    mockAuditCreate.mockImplementation(async () => null);
  });

  test('returns true on successful deletion', async () => {
    const result = await MonitorService.deleteMonitor(userId, monitorId);
    expect(result).toBe(true);
  });

  test('throws 404 when monitor not found or not owned', async () => {
    mockMonitorFindFirst.mockImplementation(async () => null);

    await expect(
      MonitorService.deleteMonitor(userId, 'missing-monitor')
    ).rejects.toMatchObject({ status: 404 });
  });
});

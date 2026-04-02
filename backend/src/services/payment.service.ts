import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma.js';
import { logAuditAction } from './audit.service.js';

export type FailedPaymentWithLinks = Prisma.FailedPaymentGetPayload<{
  include: { recoveryLinks: { orderBy: { createdAt: 'desc' }, take: 1 } }
}>;

const ZERO_METRICS = {
  failedAmount: 0, recoveredAmount: 0, recoveryRate: 0,
  recoveredThisWeek: 0, recoveredThisMonth: 0, recoveredViaLink: 0,
};

// Exported so recovery.processor.ts can schedule BullMQ jobs with the same delays.
// Index = current retryCount (before increment): [0→retry1 after 24h, 1→retry2 after 72h]
export const RETRY_DELAYS_MS = [24 * 60 * 60 * 1000, 72 * 60 * 60 * 1000] as const;

/** Retrieves a paginated list of failed payments with optional filters. */
export const getPaymentsList = async (userId: string, { status, search, page = 1, limit = 50 }: any = {}) => {
  const where: Prisma.FailedPaymentWhereInput = { 
    userId,
    ...(status && { status }),
    ...(search && { OR: [
      { customerEmail: { contains: search } },
      { paymentId: { contains: search } },
      { customerName: { contains: search } },
    ]}),
  };

  const [payments, total] = await Promise.all([
    prisma.failedPayment.findMany({
      where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit,
      include: { recoveryLinks: { orderBy: { createdAt: 'desc' }, take: 1 } },
    }),
    prisma.failedPayment.count({ where }),
  ]);

  return { payments, total, page, limit, pages: Math.ceil(total / limit) };
};

export const getPaymentDetails = (userId: string, id: string) => 
  prisma.failedPayment.findFirstOrThrow({
    where: { id, userId },
    include: {
      recoveryLinks: { orderBy: { createdAt: 'desc' } },
      reminders: { orderBy: { sentAt: 'desc' } },
      event: true,
    },
  });

export const markPaymentRecovered = async (failedPaymentId: string, userId: string, via: 'link' | 'external' = 'link') => {
  await prisma.failedPayment.update({
    where: { id: failedPaymentId },
    data: { status: 'recovered', recoveredAt: new Date(), recoveredVia: via },
  });
  await logAuditAction(userId, 'PAYMENT_RECOVERED', 'FailedPayment', failedPaymentId, { via });
};

export const markPaymentAbandoned = async (failedPaymentId: string, userId: string) => {
  await prisma.failedPayment.update({ where: { id: failedPaymentId }, data: { status: 'abandoned' } });
  await logAuditAction(userId, 'PAYMENT_ABANDONED', 'FailedPayment', failedPaymentId);
};

/** Optimized background processing: Fetches up to 20 payments ready for retry. */
export const getPendingRetries = async (): Promise<FailedPaymentWithLinks[]> => {
  const lockExpiry = new Date(Date.now() - 30 * 60 * 1000);
  const now = new Date();

  const candidates = await prisma.failedPayment.findMany({
    where: {
      status: { in: ['pending', 'retrying'] },
      retryCount: { lt: 3 },
      nextRetryAt: { lte: now },
      user: { plan: { in: ['starter', 'pro'] } },
      OR: [{ lockedAt: null }, { lockedAt: { lt: lockExpiry } }],
    },
    select: { id: true },
    take: 20,
  });

  if (!candidates.length) return [];
  const ids = candidates.map(c => c.id);

  await prisma.failedPayment.updateMany({ where: { id: { in: ids } }, data: { lockedAt: now } });
  return (await prisma.failedPayment.findMany({
    where: { id: { in: ids }, lockedAt: now },
    include: { recoveryLinks: { orderBy: { createdAt: 'desc' }, take: 1 } },
  })) as FailedPaymentWithLinks[];
};

export const releasePaymentLock = (id: string) => 
  prisma.failedPayment.update({ where: { id }, data: { lockedAt: null } });

export const recordRetryReminder = async (id: string, dayOffset: number, type: string) => {
  const p = await prisma.failedPayment.findUnique({ where: { id }, select: { retryCount: true } });
  const count = (p?.retryCount ?? 0) + 1;
  const delay = RETRY_DELAYS_MS[p?.retryCount ?? 0] ?? null;

  await prisma.$transaction([
    prisma.reminder.create({ data: { failedPaymentId: id, dayOffset, type, status: 'sent' } }),
    prisma.failedPayment.update({
      where: { id },
      data: { 
        retryCount: count, lastRetryAt: new Date(), 
        nextRetryAt: delay ? new Date(Date.now() + (delay as number)) : null,
        status: 'retrying', lockedAt: null 
      },
    }),
  ]);
  return count;
};

export const createRecoveryLinkRecord = (failedPaymentId: string, url: string) =>
  prisma.recoveryLink.create({ data: { failedPaymentId, url } });

export const triggerManualRetry = async (userId: string, id: string) => {
  const p = await prisma.failedPayment.findFirst({ where: { id, userId } });
  if (!p) throw { status: 404, message: 'Payment not found' };
  if (!['pending', 'retrying'].includes(p.status)) throw { status: 400, message: 'Invalid status' };
  await prisma.failedPayment.update({ where: { id }, data: { nextRetryAt: new Date() } });
};

export const getPaymentMetrics = async (userId: string) => {
  try {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Optimized: Combine basic sums/counts into one groupBy instead of 5 separate aggregates
    const [statsByStatus, weekRecovered, monthRecovered, viaLinkRecovered] = await Promise.all([
      prisma.failedPayment.groupBy({
        by: ['status'], where: { userId }, _sum: { amount: true }, _count: true 
      }),
      prisma.failedPayment.aggregate({ where: { userId, status: 'recovered', recoveredAt: { gte: weekAgo } }, _sum: { amount: true } }),
      prisma.failedPayment.aggregate({ where: { userId, status: 'recovered', recoveredAt: { gte: monthAgo } }, _sum: { amount: true } }),
      prisma.failedPayment.aggregate({ where: { userId, status: 'recovered', recoveredVia: 'link' }, _sum: { amount: true } }),
    ]);

    const stats = Object.fromEntries(statsByStatus.map(s => [s.status, { sum: s._sum.amount ?? 0, count: s._count }]));
    const totalFailedSum = Object.values(stats).reduce((acc, s) => acc + s.sum, 0);
    const recoveredSum = stats['recovered']?.sum ?? 0;

    return {
      failedAmount: totalFailedSum,
      recoveredAmount: recoveredSum,
      recoveryRate: totalFailedSum > 0 ? Math.round((recoveredSum / totalFailedSum) * 1000) / 1000 : 0,
      recoveredThisWeek: weekRecovered._sum.amount ?? 0,
      recoveredThisMonth: monthRecovered._sum.amount ?? 0,
      recoveredViaLink: viaLinkRecovered._sum.amount ?? 0,
      counts: Object.fromEntries(Object.entries(stats).map(([k, v]) => [k, v.count])),
    };
  } catch (err) {
    console.error('Metrics Error:', err);
    return { ...ZERO_METRICS, counts: {} };
  }
};

export const getFullDashboardStats = async (userId: string) => {
  const m = await getPaymentMetrics(userId);
  const counts = { pending: 0, retrying: 0, recovered: 0, abandoned: 0, ...m.counts };
  return {
    totalFailed: (counts.pending || 0) + (counts.retrying || 0),
    totalRecovered: counts.recovered || 0,
    recoveryRate: Math.round(m.recoveryRate * 1000) / 10, // decimal → percentage
    totalFailedAmount: m.failedAmount,
    totalRecoveredAmount: m.recoveredAmount,
    recoveredThisWeek: m.recoveredThisWeek,
    recoveredThisMonth: m.recoveredThisMonth,
    counts,
  };
};

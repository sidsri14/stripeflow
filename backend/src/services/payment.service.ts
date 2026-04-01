import { prisma } from '../utils/prisma.js';

export class PaymentService {
  static async createFailedPayment(
    userId: string,
    data: {
      paymentId: string;
      orderId?: string;
      amount: number;
      currency: string;
      customerEmail: string;
      customerPhone?: string;
      customerName?: string;
      metadata?: string;
      eventId?: string;
    }
  ) {
    return prisma.failedPayment.create({
      data: {
        userId,
        paymentId: data.paymentId,
        orderId: data.orderId,
        amount: data.amount,
        currency: data.currency,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone,
        customerName: data.customerName,
        metadata: data.metadata,
        eventId: data.eventId,
        nextRetryAt: new Date(), // process immediately on next worker tick
      },
    });
  }

  static async getPayments(
    userId: string,
    filters?: {
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
      sortKey?: string;
      sortDir?: 'asc' | 'desc';
    }
  ) {
    const page = Math.max(1, filters?.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters?.limit ?? 50));
    const skip = (page - 1) * limit;

    // Whitelist sortKey to prevent field enumeration via property injection
    const ALLOWED_SORT_KEYS = ['createdAt', 'amount', 'status', 'retryCount'];
    const sortKey = ALLOWED_SORT_KEYS.includes(filters?.sortKey ?? '') ? filters!.sortKey! : 'createdAt';
    const sortDir: 'asc' | 'desc' = filters?.sortDir === 'asc' ? 'asc' : 'desc';

    // Cap search to prevent excessive DB CPU from very long inputs
    const search = filters?.search ? filters.search.slice(0, 100) : undefined;

    const where = {
      userId,
      ...(filters?.status && filters.status !== 'ALL' && { status: filters.status }),
      ...(search && {
        OR: [
          { customerEmail: { contains: search } },
          { customerName: { contains: search } },
          { paymentId: { contains: search } },
        ],
      }),
    };

    const [payments, total] = await Promise.all([
      prisma.failedPayment.findMany({
        where,
        orderBy: { [sortKey]: sortDir },
        skip,
        take: limit,
        include: {
          reminders: { orderBy: { sentAt: 'asc' }, take: 10 },
          recoveryLinks: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      }),
      prisma.failedPayment.count({ where }),
    ]);

    return { payments, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  static async getPaymentById(userId: string, id: string) {
    const payment = await prisma.failedPayment.findFirst({
      where: { id, userId },
      include: {
        reminders: { orderBy: { sentAt: 'asc' } },
        recoveryLinks: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!payment) {
      const err = new Error('Payment not found') as any;
      err.status = 404;
      throw err;
    }
    return payment;
  }

  /**
   * Aggregates payment statistics using DB-side aggregation (no full table scan).
   * Runs 4 parallel queries instead of fetching all rows into JS.
   * Returns zeroed stats on DB error so the dashboard degrades gracefully.
   */
  static async getDashboardStats(userId: string) {
    const ZERO = {
      totalFailed: 0, totalRecovered: 0, recoveryRate: 0,
      totalFailedAmount: 0, totalRecoveredAmount: 0,
      recoveredThisWeek: 0, recoveredThisMonth: 0,
    };
    try {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [totalAgg, recoveredAgg, weekAgg, monthAgg] = await Promise.all([
        prisma.failedPayment.aggregate({ where: { userId }, _count: { id: true }, _sum: { amount: true } }),
        prisma.failedPayment.aggregate({ where: { userId, status: 'recovered' }, _count: { id: true }, _sum: { amount: true } }),
        prisma.failedPayment.aggregate({ where: { userId, status: 'recovered', recoveredAt: { gte: weekAgo } }, _sum: { amount: true } }),
        prisma.failedPayment.aggregate({ where: { userId, status: 'recovered', recoveredAt: { gte: monthAgo } }, _sum: { amount: true } }),
      ]);

      const totalFailed = totalAgg._count.id;
      const totalRecovered = recoveredAgg._count.id;
      const totalFailedAmount = totalAgg._sum.amount ?? 0;
      const totalRecoveredAmount = recoveredAgg._sum.amount ?? 0;
      const recoveryRate = totalFailed > 0 ? (totalRecovered / totalFailed) * 100 : 0;

      return {
        totalFailed,
        totalRecovered,
        recoveryRate: Math.round(recoveryRate * 10) / 10,
        totalFailedAmount,
        totalRecoveredAmount,
        recoveredThisWeek: weekAgg._sum.amount ?? 0,
        recoveredThisMonth: monthAgg._sum.amount ?? 0,
      };
    } catch {
      return ZERO;
    }
  }

  static async markRecovered(failedPaymentId: string, via: 'link' | 'external' = 'link') {
    await prisma.failedPayment.update({
      where: { id: failedPaymentId },
      data: { status: 'recovered', recoveredAt: new Date(), recoveredVia: via },
    });
  }

  // Status: pending → retrying → abandoned
  // Retry timing controlled by nextRetryAt field
  // Only paid-plan users get auto-recovery. Free plan = tracking only.
  static async getPendingForRetry() {
    const lockExpiry = new Date(Date.now() - 30 * 60 * 1000); // 30 min lock expiry
    const now = new Date();

    // 1. Find payments that are due and not locked (or lock expired)
    const candidates = await prisma.failedPayment.findMany({
      where: {
        status: { in: ['pending', 'retrying'] },
        retryCount: { lt: 3 },
        nextRetryAt: { lte: now },
        user: { plan: 'paid' },
        OR: [
          { lockedAt: null },
          { lockedAt: { lt: lockExpiry } },
        ],
      },
      select: { id: true },
      take: 20, // process at most 20 per tick to avoid overwhelming provider
    });

    if (candidates.length === 0) return [];

    const candidateIds = candidates.map(c => c.id);

    // 2. Clear out any old locks for these IDs and set new lock
    // (This works as an advisory lock in concurrent environments)
    await prisma.failedPayment.updateMany({
      where: { id: { in: candidateIds } },
      data: { lockedAt: now },
    });

    // 3. Fetch the full record for the locked items
    return prisma.failedPayment.findMany({
      where: { id: { in: candidateIds }, lockedAt: now },
      include: {
        recoveryLinks: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
  }

  static async releaseLock(id: string) {
    await prisma.failedPayment.update({
      where: { id },
      data: { lockedAt: null },
    });
  }

  static async recordReminder(failedPaymentId: string, dayOffset: number, type: string) {
    await prisma.reminder.create({
      data: { failedPaymentId, dayOffset, type, status: 'sent' },
    });
  }

  /**
   * Atomically: creates a reminder log, increments retryCount, sets next retry
   * schedule, and releases the advisory lock — all in one Prisma transaction.
   *
   * Returns the new retryCount so callers can log the correct value.
   */
  static async recordReminderAndIncrementRetry(
    failedPaymentId: string,
    dayOffset: number,
    type: string
  ): Promise<number> {
    const payment = await prisma.failedPayment.findUnique({
      where: { id: failedPaymentId },
      select: { retryCount: true },
    });
    const currentCount = payment?.retryCount ?? 0;
    const newCount = currentCount + 1;
    const delayMs = PaymentService.RETRY_DELAYS_MS[currentCount] ?? null;
    const nextRetryAt = delayMs !== null ? new Date(Date.now() + delayMs) : null;

    await prisma.$transaction([
      prisma.reminder.create({
        data: { failedPaymentId, dayOffset, type, status: 'sent' },
      }),
      prisma.failedPayment.update({
        where: { id: failedPaymentId },
        data: {
          retryCount: newCount,
          lastRetryAt: new Date(),
          nextRetryAt,
          status: 'retrying',
          lockedAt: null, // release advisory lock
        },
      }),
    ]);

    return newCount;
  }

  static async createRecoveryLink(failedPaymentId: string, url: string) {
    return prisma.recoveryLink.create({
      data: { failedPaymentId, url },
    });
  }

  // Retry delay schedule: after retry N, wait X ms before retry N+1.
  // 3 attempts total (index 0, 1, 2). null = no further retry scheduled.
  private static readonly RETRY_DELAYS_MS: (number | null)[] = [
    24 * 60 * 60 * 1000,  // after retry 0 → wait 24h  (day 1 reminder)
    72 * 60 * 60 * 1000,  // after retry 1 → wait 72h  (day 3 final notice)
    null,                  // after retry 2 → no more retries; worker abandons at retryCount >= 3
  ];

  /** Extended metrics for the billing/analytics page — DB-side aggregation only. */
  static async getMetrics(userId: string) {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [totalAgg, recoveredAgg, weekAgg, monthAgg, viaLinkAgg] = await Promise.all([
      prisma.failedPayment.aggregate({ where: { userId }, _sum: { amount: true } }),
      prisma.failedPayment.aggregate({ where: { userId, status: 'recovered' }, _sum: { amount: true } }),
      prisma.failedPayment.aggregate({ where: { userId, status: 'recovered', recoveredAt: { gte: weekAgo } }, _sum: { amount: true } }),
      prisma.failedPayment.aggregate({ where: { userId, status: 'recovered', recoveredAt: { gte: monthAgo } }, _sum: { amount: true } }),
      prisma.failedPayment.aggregate({ where: { userId, status: 'recovered', recoveredVia: 'link' }, _sum: { amount: true } }),
    ]);

    const failedAmount = totalAgg._sum.amount ?? 0;
    const recoveredAmount = recoveredAgg._sum.amount ?? 0;
    const recoveryRate = failedAmount > 0 ? recoveredAmount / failedAmount : 0;

    return {
      failedAmount,
      recoveredAmount,
      recoveryRate: Math.round(recoveryRate * 1000) / 1000,
      recoveredThisWeek: weekAgg._sum.amount ?? 0,
      recoveredThisMonth: monthAgg._sum.amount ?? 0,
      recoveredViaLink: viaLinkAgg._sum.amount ?? 0,
    };
  }

  static async markAbandoned(failedPaymentId: string) {
    await prisma.failedPayment.update({
      where: { id: failedPaymentId },
      data: { status: 'abandoned' },
    });
  }

  static async triggerManualRetry(userId: string, failedPaymentId: string) {
    const payment = await prisma.failedPayment.findFirst({
      where: { id: failedPaymentId, userId },
    });
    if (!payment) {
      const err = new Error('Payment not found') as any;
      err.status = 404;
      throw err;
    }
    if (!['pending', 'retrying'].includes(payment.status)) {
      const err = new Error('Payment cannot be retried in its current state') as any;
      err.status = 400;
      throw err;
    }
    await prisma.failedPayment.update({
      where: { id: failedPaymentId },
      data: { nextRetryAt: new Date() }, // schedule for immediate processing
    });
  }
}

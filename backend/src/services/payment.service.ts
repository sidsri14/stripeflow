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
      },
    });
  }

  static async getPayments(
    userId: string,
    filters?: { status?: string; search?: string }
  ) {
    return prisma.failedPayment.findMany({
      where: {
        userId,
        ...(filters?.status && { status: filters.status }),
        ...(filters?.search && {
          OR: [
            { customerEmail: { contains: filters.search } },
            { customerName: { contains: filters.search } },
            { paymentId: { contains: filters.search } },
          ],
        }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        reminders: { orderBy: { sentAt: 'asc' } },
        recoveryLinks: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
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

  static async getDashboardStats(userId: string) {
    const all = await prisma.failedPayment.findMany({
      where: { userId },
      select: { status: true, amount: true },
    });

    const totalFailed = all.length;
    const recovered = all.filter((p) => p.status === 'recovered');
    const totalRecovered = recovered.length;
    const totalFailedAmount = all.reduce((sum, p) => sum + p.amount, 0);
    const totalRecoveredAmount = recovered.reduce((sum, p) => sum + p.amount, 0);
    const recoveryRate = totalFailed > 0 ? (totalRecovered / totalFailed) * 100 : 0;

    return {
      totalFailed,
      totalRecovered,
      recoveryRate: Math.round(recoveryRate * 10) / 10,
      totalFailedAmount,
      totalRecoveredAmount,
    };
  }

  static async markRecovered(failedPaymentId: string) {
    await prisma.failedPayment.update({
      where: { id: failedPaymentId },
      data: { status: 'recovered', recoveredAt: new Date() },
    });
  }

  // Status: pending → retrying → abandoned
  // Retry timing: 0 = immediately, 1 = 24h, 2 = 72h
  static async getPendingForRetry() {
    const now = new Date();
    const ago24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const ago72h = new Date(now.getTime() - 72 * 60 * 60 * 1000);

    return prisma.failedPayment.findMany({
      where: {
        status: { in: ['pending', 'retrying'] },
        retryCount: { lt: 3 },
        OR: [
          { retryCount: 0, lastRetryAt: null },
          { retryCount: 1, lastRetryAt: { lte: ago24h } },
          { retryCount: 2, lastRetryAt: { lte: ago72h } },
        ],
      },
      include: {
        recoveryLinks: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
  }

  static async recordReminder(failedPaymentId: string, dayOffset: number, type: string) {
    await prisma.reminder.create({
      data: { failedPaymentId, dayOffset, type, status: 'sent' },
    });
  }

  static async createRecoveryLink(failedPaymentId: string, url: string) {
    return prisma.recoveryLink.create({
      data: { failedPaymentId, url },
    });
  }

  static async incrementRetry(failedPaymentId: string) {
    const payment = await prisma.failedPayment.findUnique({
      where: { id: failedPaymentId },
      select: { retryCount: true },
    });
    const newCount = (payment?.retryCount ?? 0) + 1;
    await prisma.failedPayment.update({
      where: { id: failedPaymentId },
      data: {
        retryCount: { increment: 1 },
        lastRetryAt: new Date(),
        // Move to retrying after first attempt
        status: newCount >= 1 ? 'retrying' : 'pending',
      },
    });
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
      data: { lastRetryAt: new Date(0) },
    });
  }
}

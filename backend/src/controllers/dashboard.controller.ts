import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.middleware.js';
import { prisma } from '../utils/prisma.js';
import { successResponse } from '../utils/apiResponse.js';

export const getDashboardStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [total, paid, overdue, pending, abandoned, rawTimeseries] = await Promise.all([
      prisma.invoice.aggregate({ where: { userId }, _sum: { amount: true }, _count: true }),
      prisma.invoice.aggregate({ where: { userId, status: 'PAID' }, _sum: { amount: true }, _count: true }),
      prisma.invoice.aggregate({ where: { userId, status: 'OVERDUE' }, _count: true }),
      prisma.invoice.aggregate({ where: { userId, status: 'SENT' }, _count: true }),
      prisma.invoice.count({ where: { userId, status: 'CANCELLED' } }),
      prisma.$queryRaw<Array<{ date: string; volume: bigint; paid: bigint }>>`
        SELECT
          TO_CHAR("createdAt"::date, 'YYYY-MM-DD') AS date,
          SUM(amount)::bigint AS volume,
          SUM(CASE WHEN status = 'PAID' THEN amount ELSE 0 END)::bigint AS paid
        FROM "Invoice"
        WHERE "userId" = ${userId}
          AND "createdAt" >= ${thirtyDaysAgo}
        GROUP BY "createdAt"::date
        ORDER BY "createdAt"::date ASC
      `,
    ]);

    const totalVolume = total._sum.amount ?? 0;
    const paidVolume = paid._sum.amount ?? 0;

    const timeseries = rawTimeseries.map(row => ({
      date: row.date,
      volume: Number(row.volume),
      paid: Number(row.paid),
    }));

    successResponse(res, {
      totalVolume,
      paidVolume,
      paidRate: totalVolume > 0 ? Math.round((paidVolume / totalVolume) * 100) : 0,
      counts: {
        pending: pending._count,
        paid: paid._count,
        overdue: overdue._count,
        abandoned,
      },
      timeseries,
    });
  } catch (err) { next(err); }
};

export const getMetrics = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const [paidThisMonth, overdueCount] = await Promise.all([
      prisma.invoice.aggregate({
        where: { userId, status: 'PAID', paidAt: { gte: startOfMonth } },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.invoice.count({ where: { userId, status: 'OVERDUE' } }),
    ]);
    successResponse(res, {
      paidThisMonth: paidThisMonth._sum.amount ?? 0,
      paidCountThisMonth: paidThisMonth._count,
      overdueCount,
    });
  } catch (err) { next(err); }
};

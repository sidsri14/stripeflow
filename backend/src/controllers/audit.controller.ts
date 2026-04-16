import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.middleware.js';
import { prisma } from '../utils/prisma.js';
import { successResponse } from '../utils/apiResponse.js';

export const getAuditLogs = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: { userId: req.userId! },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where: { userId: req.userId! } })
    ]);

    successResponse(res, { logs, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};

export const exportAuditLogs = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const logs = await prisma.auditLog.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' },
    });

    const escapeCSV = (val: string | null | undefined): string => {
      if (!val) return '""';
      return `"${val.replace(/"/g, '""')}"`;
    };

    let csv = 'ID,Action,Resource,Resource ID,Details,Date\n';
    for (const log of logs) {
      csv += [
        escapeCSV(log.id),
        escapeCSV(log.action),
        escapeCSV(log.resource),
        escapeCSV(log.resourceId),
        escapeCSV(log.details),
        escapeCSV(log.createdAt.toISOString()),
      ].join(',') + '\n';
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="audit-log.csv"');
    res.status(200).send(csv);
  } catch (err) {
    next(err);
  }
};

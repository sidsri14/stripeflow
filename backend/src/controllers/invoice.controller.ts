import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.middleware.js';
import { prisma } from '../utils/prisma.js';
import { InvoiceService } from '../services/InvoiceService.js';
import { generateInvoicePDF } from '../services/pdf.service.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

export class InvoiceController {
  static async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { clientId, clientEmail, description, amount, dueDate, currency } = req.body;

      if (!clientEmail || !description || !amount || !dueDate) {
        return errorResponse(res, 'Missing required fields', 400);
      }

      const parsedAmount = parseInt(amount, 10);
      if (!Number.isInteger(parsedAmount) || parsedAmount <= 0 || parsedAmount > 99_999_999) {
        return errorResponse(res, 'Amount must be a positive integer (in cents, max $999,999.99)', 400);
      }

      const parsedDue = new Date(dueDate);
      if (isNaN(parsedDue.getTime())) {
        return errorResponse(res, 'Invalid due date', 400);
      }

      const result = await InvoiceService.createInvoice(req.userId!, {
        clientId,
        clientEmail,
        description,
        amount: parsedAmount,
        dueDate: parsedDue,
        currency
      });

      successResponse(res, result);
    } catch (err) {
      next(err);
    }
  }

  static async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 10, search, status, clientId, sortKey = 'createdAt', sortDir = 'desc' } = req.query;

      const ALLOWED_SORT_KEYS = ['createdAt', 'updatedAt', 'dueDate', 'amount', 'status'] as const;
      const ALLOWED_SORT_DIRS = ['asc', 'desc'] as const;
      const safeSortKey = ALLOWED_SORT_KEYS.includes(String(sortKey) as any) ? String(sortKey) : 'createdAt';
      const safeSortDir = ALLOWED_SORT_DIRS.includes(String(sortDir) as any) ? (String(sortDir) as 'asc' | 'desc') : 'desc';

      const skip = (Number(page) - 1) * Number(limit);
      const take = Math.min(Number(limit), 100); // cap at 100 per page

      const where: any = {
        userId: req.userId!,
        ...(status && { status: String(status) }),
        ...(clientId && { clientId: String(clientId) }),
        ...(search && {
          OR: [
            { clientEmail: { contains: String(search), mode: 'insensitive' } },
            { description: { contains: String(search), mode: 'insensitive' } },
            { client: { name: { contains: String(search), mode: 'insensitive' } } }
          ]
        })
      };

      const [invoices, total] = await Promise.all([
        prisma.invoice.findMany({
          where,
          include: { client: true },
          orderBy: { [safeSortKey]: safeSortDir },
          skip,
          take
        }),
        prisma.invoice.count({ where })
      ]);

      successResponse(res, {
        invoices,
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / take)
      });
    } catch (err) {
      next(err);
    }
  }

  static async get(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const userId = String(req.userId);
      const invoice = await prisma.invoice.findFirst({
        where: { id, userId },
        include: { client: true }
      });
      if (!invoice) return errorResponse(res, 'Invoice not found', 404);
      successResponse(res, invoice);
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const userId = String(req.userId);
      const count = await prisma.invoice.deleteMany({ where: { id, userId } });
      if (count.count === 0) return errorResponse(res, 'Invoice not found', 404);
      successResponse(res, { success: true });
    } catch (err) {
      next(err);
    }
  }

  static async getPdf(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const userId = String(req.userId);
      const invoice = await prisma.invoice.findFirst({
        where: { id, userId },
        include: { client: true, user: true, items: true },
      });
      if (!invoice) return errorResponse(res, 'Invoice not found', 404);
      const pdf = await generateInvoicePDF(invoice as any);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${invoice.number}.pdf"`);
      return res.send(pdf);
    } catch (err) {
      next(err);
    }
  }
}

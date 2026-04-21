import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.middleware.js';
import { prisma } from '../utils/prisma.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

export class ClientController {
  static async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { name, email, phone, company } = req.body;
      if (!name || !email) return errorResponse(res, 'Name and Email are required', 400);

      const client = await prisma.client.create({
        data: { userId: req.userId!, name, email, phone, company }
      });
      successResponse(res, client);
    } catch (err) {
      next(err);
    }
  }

  static async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const clients = await prisma.client.findMany({
        where: { userId: req.userId! },
        orderBy: { name: 'asc' }
      });
      successResponse(res, clients);
    } catch (err) {
      next(err);
    }
  }

  static async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const userId = String(req.userId);
      const existing = await prisma.client.findFirst({ where: { id, userId } });
      if (!existing) return errorResponse(res, 'Client not found', 404);
      // Whitelist mutable fields — prevents userId/id injection via req.body
      const { name, email, phone, company } = req.body;
      const client = await prisma.client.update({ where: { id }, data: { name, email, phone, company } });
      successResponse(res, client);
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const userId = String(req.userId);
      const count = await prisma.client.deleteMany({ where: { id, userId } });
      if (count.count === 0) return errorResponse(res, 'Client not found', 404);
      successResponse(res, { success: true });
    } catch (err) {
      next(err);
    }
  }
}

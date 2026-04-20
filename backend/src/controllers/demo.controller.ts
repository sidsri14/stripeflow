import type { Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

export class DemoController {
  static async getInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      
      if (id === 'demo') {
        const mockInvoice = {
          id: 'demo-inv-123',
          number: 'INV-DEMO-001',
          description: 'Premium Web Design Services',
          amount: 250000,
          currency: 'INR',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          clientEmail: 'client@example.com',
          status: 'pending',
          user: { name: 'Freelancer Pete' },
          pdfUrl: '#'
        };
        return successResponse(res, mockInvoice);
      }

      // In a real app, you might fetch from DB, but for demo we just handle 'demo'
      return errorResponse(res, 'Demo invoice not found', 404);
    } catch (err) {
      next(err);
    }
  }

  static async payInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      // Simulate checkout redirect
      successResponse(res, { url: '/dashboard?demo=success' });
    } catch (err) {
      next(err);
    }
  }
}

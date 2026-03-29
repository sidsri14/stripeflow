import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.middleware.js';
import { PaymentService } from '../services/payment.service.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

export const getDashboardStats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const stats = await PaymentService.getDashboardStats(req.userId!);
    successResponse(res, stats);
  } catch (error: any) {
    errorResponse(res, error.message, 500);
  }
};

export const getMetrics = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const metrics = await PaymentService.getMetrics(req.userId!);
    successResponse(res, metrics);
  } catch (error: any) {
    errorResponse(res, error.message, 500);
  }
};

import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.middleware.js';
import { SourceService } from '../services/source.service.js';
import { AuditService } from '../services/audit.service.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { z } from 'zod';

const connectSchema = z.object({
  // Razorpay key IDs are always rzp_test_... or rzp_live_... followed by 14+ alphanumeric chars
  keyId: z.string().regex(/^rzp_(test|live)_[a-zA-Z0-9]{14,}$/, 'Invalid Razorpay Key ID format'),
  keySecret: z.string().min(20).max(100),
  webhookSecret: z.string().min(20).max(256),
  name: z.string().max(100).optional(),
});

export const connectSource = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = connectSchema.safeParse(req.body);
    if (!parsed.success) {
      errorResponse(res, 'Invalid request body', 400);
      return;
    }
    const source = await SourceService.createSource(req.userId!, parsed.data);
    successResponse(res, source, 201);
  } catch (error: any) {
    next(error);
  }
};

export const getSources = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const sources = await SourceService.getSources(req.userId!);
    successResponse(res, sources);
  } catch (error: any) {
    next(error);
  }
};

export const deleteSource = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const sourceId = req.params['id'] as string;
    await SourceService.deleteSource(req.userId!, sourceId);
    await AuditService.log(req.userId!, 'SOURCE_DELETED', 'PaymentSource', sourceId);
    successResponse(res, { deleted: true });
  } catch (error: any) {
    next(error);
  }
};

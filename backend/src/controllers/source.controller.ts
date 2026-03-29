import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.middleware.js';
import { SourceService } from '../services/source.service.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { z } from 'zod';

const connectSchema = z.object({
  keyId: z.string().min(1),
  keySecret: z.string().min(1),
  webhookSecret: z.string().min(1),
  name: z.string().optional(),
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
    await SourceService.deleteSource(req.userId!, req.params.id);
    successResponse(res, { deleted: true });
  } catch (error: any) {
    next(error);
  }
};

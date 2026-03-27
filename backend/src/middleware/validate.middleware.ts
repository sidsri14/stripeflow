import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import type { ZodSchema } from 'zod';
import { errorResponse } from '../utils/apiResponse.js';

export const validateRequest = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        const message = error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(', ');
        errorResponse(res, message, 400);
      } else {
        errorResponse(res, 'Internal validation error', 500);
      }
    }
  };
};

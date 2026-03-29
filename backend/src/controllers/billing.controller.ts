import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.middleware.js';
import { prisma } from '../utils/prisma.js';
import { successResponse } from '../utils/apiResponse.js';

export const getBillingStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { plan: true },
    });
    successResponse(res, { plan: user?.plan ?? 'free' });
  } catch (error: any) {
    next(error);
  }
};

// In production this would go through Stripe/Razorpay Subscriptions first.
// For now it directly upgrades the plan after payment confirmation would occur.
export const upgradeToPaid = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await prisma.user.update({
      where: { id: req.userId! },
      data: { plan: 'paid' },
      select: { id: true, email: true, plan: true },
    });
    successResponse(res, { plan: user.plan });
  } catch (error: any) {
    next(error);
  }
};

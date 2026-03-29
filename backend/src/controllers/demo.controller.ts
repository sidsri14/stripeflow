import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.middleware.js';
import { PaymentService } from '../services/payment.service.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { prisma } from '../utils/prisma.js';
import crypto from 'crypto';

const DEMO_AMOUNTS = [49900, 99900, 199900, 299900, 499900]; // ₹499, ₹999, ₹1999, ₹2999, ₹4999
const DEMO_NAMES = ['Arjun Sharma', 'Priya Patel', 'Rahul Verma', 'Sneha Iyer', 'Vikram Nair'];
const DEMO_PRODUCTS = ['Pro Plan', 'Business Plan', 'Enterprise Plan', 'Annual Subscription', 'Starter Pack'];

export const simulateFailure = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.userId!;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!user) {
      errorResponse(res, 'User not found', 404);
      return;
    }

    // Pick random demo data
    const idx = Math.floor(Math.random() * DEMO_AMOUNTS.length);
    const amount = DEMO_AMOUNTS[idx] ?? DEMO_AMOUNTS[0]!;
    const name = DEMO_NAMES[idx] ?? DEMO_NAMES[0]!;
    const product = DEMO_PRODUCTS[idx] ?? DEMO_PRODUCTS[0]!;
    const demoPaymentId = `pay_DEMO_${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

    const payment = await PaymentService.createFailedPayment(userId, {
      paymentId: demoPaymentId,
      amount,
      currency: 'INR',
      customerEmail: user.email,
      customerName: name,
      metadata: JSON.stringify({
        demo: true,
        description: product,
        error_code: 'BAD_REQUEST_ERROR',
        error_description: 'Your payment has been declined.',
      }),
    });

    successResponse(res, {
      id: payment.id,
      paymentId: demoPaymentId,
      amount,
      customerName: name,
      product,
      message: 'Demo payment failure created. The worker will process it on its next tick.',
    }, 201);
  } catch (error: any) {
    next(error);
  }
};

export const simulateRecovery = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params['id'] as string;
    const payment = await prisma.failedPayment.findFirst({
      where: { id, userId: req.userId! },
    });
    if (!payment) {
      errorResponse(res, 'Payment not found', 404);
      return;
    }
    if (payment.status === 'recovered') {
      errorResponse(res, 'Payment already recovered', 400);
      return;
    }
    await PaymentService.markRecovered(id as string, 'external');
    successResponse(res, { recovered: true, paymentId: payment.paymentId });
  } catch (error: any) {
    next(error);
  }
};

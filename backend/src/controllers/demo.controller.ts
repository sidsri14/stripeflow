import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.middleware.js';
import { PaymentService } from '../services/payment.service.js';
import { RazorpayService } from '../services/razorpay.service.js';
import { sendPaymentFailedEmail } from '../services/email.service.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { prisma } from '../utils/prisma.js';
import crypto from 'crypto';
import pino from 'pino';

const logger = pino({ transport: { target: 'pino-pretty', options: { colorize: true } } });

// Combined into objects so indices can never fall out of sync
const DEMO_PAYMENTS = [
  { amount: 49900,  name: 'Arjun Sharma', product: 'Pro Plan' },
  { amount: 99900,  name: 'Priya Patel',  product: 'Business Plan' },
  { amount: 199900, name: 'Rahul Verma',  product: 'Enterprise Plan' },
  { amount: 299900, name: 'Sneha Iyer',   product: 'Annual Subscription' },
  { amount: 499900, name: 'Vikram Nair',  product: 'Starter Pack' },
];

export const simulateFailure = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.userId!;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!user) {
      errorResponse(res, 'User not found', 404);
      return;
    }

    const demo = DEMO_PAYMENTS[Math.floor(Math.random() * DEMO_PAYMENTS.length)]!;
    const demoPaymentId = `pay_DEMO_${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

    const payment = await PaymentService.createFailedPayment(userId, {
      paymentId: demoPaymentId,
      amount: demo.amount,
      currency: 'INR',
      customerEmail: user.email,
      customerName: demo.name,
      metadata: JSON.stringify({
        demo: true,
        description: demo.product,
        error_code: 'BAD_REQUEST_ERROR',
        error_description: 'Your payment has been declined.',
      }),
    });

    // Instant recovery attempt — create Razorpay payment link immediately so
    // the user sees the full failure→recovery flow without waiting for the worker.
    let paymentLink: string | undefined;
    try {
      paymentLink = await RazorpayService.createPaymentLink(
        process.env.RAZORPAY_KEY_ID!,
        process.env.RAZORPAY_KEY_SECRET!,
        {
          amount: demo.amount,
          currency: 'INR',
          customerName: demo.name,
          customerEmail: user.email,
          description: `Recovery link for ${demo.product}`,
          referenceId: payment.id,
        }
      );
      await PaymentService.createRecoveryLink(payment.id, paymentLink);
      void sendPaymentFailedEmail(user.email, {
        customerName: demo.name,
        amount: demo.amount,
        currency: 'INR',
        paymentLink,
        paymentId: demoPaymentId,
      }).catch(err => logger.warn({ err }, 'Demo email failed to send'));
      await PaymentService.recordReminderAndIncrementRetry(payment.id, 0, 'email');
    } catch {
      // Non-fatal — payment exists, worker will retry on next tick
    }

    successResponse(res, {
      id: payment.id,
      paymentId: demoPaymentId,
      amount: demo.amount,
      customerName: demo.name,
      product: demo.product,
      paymentLink,
      message: paymentLink
        ? 'Recovery link created — customer emailed instantly.'
        : 'Demo payment failure created. Worker will process on next tick.',
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
    await PaymentService.markRecovered(id, 'external');
    successResponse(res, { recovered: true, paymentId: payment.paymentId });
  } catch (error: any) {
    next(error);
  }
};

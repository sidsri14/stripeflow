import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.middleware.js';
import { BillingService } from '../services/BillingService.js';
import { RazorpayService } from '../services/RazorpayService.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import pino from 'pino';

const logger = pino({ transport: { target: 'pino-pretty', options: { colorize: true } } });

/**
 * Controller for platform-level billing and subscriptions.
 * Day 1-2 of Monetization Roadmap.
 */
export const createSubscription = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { plan } = req.body; // "starter" or "pro"
    if (!['starter', 'pro'].includes(plan)) {
      return errorResponse(res, 'Invalid plan', 400);
    }

    const result = await BillingService.createSubscription(req.userId!, plan as 'starter' | 'pro');
    successResponse(res, result);
  } catch (err) {
    next(err);
  }
};

/**
 * Directly updates the user's plan.
 * For production this should go through the Razorpay subscription webhook flow,
 * but this endpoint allows manual plan changes for dev/support scenarios.
 */
export const updatePlan = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { plan } = req.body;
    if (!['free', 'starter', 'pro'].includes(plan)) {
      return errorResponse(res, 'Invalid plan. Must be free, starter, or pro.', 400);
    }
    const { prisma } = await import('../utils/prisma.js');
    const user = await prisma.user.update({
      where: { id: req.userId! },
      data: { plan },
      select: { id: true, email: true, plan: true, createdAt: true },
    });
    successResponse(res, { user });
  } catch (err) {
    next(err);
  }
};

/**
 * Public webhook endpoint for Razorpay subscription events.
 * Securely verified with 'x-razorpay-signature'.
 */
export const billingWebhook = async (req: any, res: Response, next: NextFunction) => {
  try {
    const sig = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (typeof sig !== 'string' || !webhookSecret) {
      logger.warn('[Billing Webhook] Missing signature or webhook secret not configured');
      return errorResponse(res, 'Invalid signature', 400);
    }

    const rawBody = (req.body as Buffer).toString('utf8');
    logger.debug({ secret_len: webhookSecret.length }, '[Billing Webhook] Received');

    const isValid = await RazorpayService.verifyWebhookSignature(rawBody, sig, webhookSecret);
    logger.debug({ isValid }, '[Billing Webhook] Signature check result');

    if (!isValid) {
      return errorResponse(res, 'Invalid signature', 400);
    }

    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch {
      logger.warn('[Billing Webhook] Malformed JSON body');
      return errorResponse(res, 'Invalid request body', 400);
    }
    await BillingService.handleSubscriptionWebhook(event);

    successResponse(res, { success: true });
  } catch (err) {
    next(err);
  }
};

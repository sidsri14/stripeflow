import { z } from 'zod';

export const createSubscriptionSchema = z.object({
  plan: z.enum(['starter', 'pro'], { message: 'plan must be "starter" or "pro"' }),
  gateway: z.enum(['razorpay', 'stripe']).default('razorpay'),
});

export const updatePlanSchema = z.object({
  plan: z.enum(['free', 'starter', 'pro'], { message: 'plan must be "free", "starter", or "pro"' }),
});

import Stripe from 'stripe';
import { prisma } from '../utils/prisma.js';

const stripe = new Stripe(process.env.STRIPE_PLATFORM_SECRET_KEY || '', {
  apiVersion: '2023-10-16' as any,
});

const PRICE_IDS = {
  starter: process.env.STRIPE_STARTER_PRICE_ID,
  pro: process.env.STRIPE_PRO_PRICE_ID,
} as const;

export class StripeBillingService {
  /**
   * Creates a Stripe Checkout Session for a plan.
   */
  static async createCheckoutSession(userId: string, plan: 'starter' | 'pro') {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw { status: 404, message: 'User not found' };

    const priceId = PRICE_IDS[plan];
    if (!priceId) {
      throw { status: 500, message: `Stripe Price ID for '${plan}' is not configured on the server.` };
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings?status=cancel`,
      metadata: {
        userId,
        plan,
      },
    });

    // We save a "pending" subscription record
    await prisma.subscription.create({
      data: {
        userId,
        providerSubscriptionId: session.id, // Temporary until authenticated
        plan,
        status: 'created',
      },
    });

    return {
      id: session.id,
      url: session.url,
    };
  }

  /**
   * Handle Stripe platform webhooks (subscription lifecycle).
   */
  static async handleWebhook(event: Stripe.Event) {
    const data = event.data.object as any;

    switch (event.type) {
      case 'checkout.session.completed': {
        const userId = data.metadata?.userId;
        const plan = data.metadata?.plan;
        
        if (userId && plan) {
          // Find the pending subscription and update it
          await prisma.subscription.updateMany({
            where: { providerSubscriptionId: data.id, userId },
            data: {
              status: 'active',
              providerSubscriptionId: data.subscription, // Replace session ID with actual subscription ID
            },
          });

          // Upgrade user
          await prisma.user.update({
            where: { id: userId },
            data: { plan },
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscriptionId = data.id;
        const subRecord = await prisma.subscription.findUnique({
          where: { providerSubscriptionId: subscriptionId },
        });

        if (subRecord) {
          await prisma.subscription.update({
            where: { id: subRecord.id },
            data: { status: 'cancelled', cancelledAt: new Date() },
          });

          await prisma.user.update({
            where: { id: subRecord.userId },
            data: { plan: 'free' },
          });
        }
        break;
      }
    }
  }

  static async verifyWebhookSignature(body: Buffer, signature: string) {
    const secret = process.env.STRIPE_PLATFORM_WEBHOOK_SECRET || '';
    return stripe.webhooks.constructEvent(body, signature, secret);
  }
}

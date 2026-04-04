import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import axios from 'axios';

const prisma = new PrismaClient();
const WEBHOOK_SECRET = 'xxxx'; // from .env
const API_URL = 'http://127.0.0.1:3000/api/billing/webhook';

async function run() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'audit-test-2@example.com' }
    });

    if (!user) {
      console.error('Test user not found');
      return;
    }

    console.log('User ID:', user.id);

    // 1. Create a dummy subscription record
    const subId = `sub_audit_${Math.random().toString(36).substring(7)}`;
    await prisma.subscription.create({
      data: {
        userId: user.id,
        razorpaySubscriptionId: subId,
        plan: 'starter',
        status: 'created'
      }
    });

    console.log('Subscription record created:', subId);

    // 2. Simulate webhook
    const payload = JSON.stringify({
      event: 'subscription.activated',
      payload: {
        subscription: {
          entity: {
            id: subId,
            status: 'active',
            plan_id: 'plan_starter_id',
            customer_id: 'cust_audit'
          }
        }
      }
    });

    const signature = crypto.createHmac('sha256', WEBHOOK_SECRET).update(payload).digest('hex');

    const res = await axios.post(API_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': signature
      }
    });

    console.log('Webhook Result:', res.status, res.data);

    // 3. Verify user plan
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id }
    });
    console.log('Updated User Plan:', updatedUser?.plan);

    process.exit(0);
  } catch (err: any) {
    if (err.response) {
      console.error('API Error:', err.response.status, err.response.data);
    } else {
      console.error('Network Error:', err.message);
    }
    process.exit(1);
  }
}

run();

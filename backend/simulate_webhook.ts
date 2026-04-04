import crypto from 'crypto';
import axios from 'axios';

const SOURCE_ID = '525322dc-d15d-4172-a8dd-f363986461bb';
const WEBHOOK_SECRET = 'test_webhook_secret_123';
const API_URL = `http://127.0.0.1:3000/api/webhooks/razorpay/${SOURCE_ID}`;

const payload = JSON.stringify({
  event: 'payment.failed',
  account_id: 'acc_test_audit',
  created_at: Math.floor(Date.now() / 1000),
  payload: {
    payment: {
      entity: {
        id: `pay_audit_${Math.random().toString(36).substring(7)}`,
        amount: 149900, // ₹1,499
        currency: 'INR',
        status: 'failed',
        email: 'audit-customer@example.com',
        contact: '+919876543210',
        notes: { name: 'Audit Customer' },
        error_code: 'BAD_REQUEST_PAYMENT_DECLINED',
        error_description: 'The payment was declined by the issuing bank.'
      }
    }
  }
});

function sign(data: string, secret: string) {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

async function run() {
  try {
    const signature = sign(payload, WEBHOOK_SECRET);
    console.log('Sending webhook with signature:', signature);
    
    const res = await axios.post(API_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': signature
      }
    });

    console.log('Response:', res.status, res.data);
  } catch (err: any) {
    if (err.response) {
      console.error('API Error:', err.response.status, err.response.data);
    } else {
      console.error('Network Error:', err.message);
    }
  }
}

run();

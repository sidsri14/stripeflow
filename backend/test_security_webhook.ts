import axios from 'axios';

const SOURCE_ID = '525322dc-d15d-4172-a8dd-f363986461bc';
const API_URL = `http://127.0.0.1:3000/api/webhooks/razorpay/${SOURCE_ID}`;

async function run() {
  try {
    const payload = JSON.stringify({
      event: 'payment.failed',
      payload: { payment: { entity: { id: 'attacker_pay_123' } } }
    });

    console.log('Sending webhook with INVALID signature...');
    
    const res = await axios.post(API_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': 'totally_fake_signature'
      }
    });

    console.log('❌ VULNERABILITY FOUND: Server accepted invalid signature!', res.status);
    process.exit(1);
  } catch (err: any) {
    if (err.response?.status === 400 || err.response?.status === 401) {
      console.log('✅ SUCCESS: Server rejected invalid signature with', err.response.status);
      process.exit(0);
    } else {
      console.error('Unexpected error:', err.message);
      process.exit(1);
    }
  }
}

run();

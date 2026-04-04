import axios from 'axios';

const SOURCE_ID = '525322dc-d15d-4172-a8dd-f363986461bb';
const API_URL = `http://127.0.0.1:3000/api/webhooks/razorpay/${SOURCE_ID}`;

async function run() {
  console.log('Flooding webhook endpoint to test rate limiting...');
  
  let successCount = 0;
  let blocked = false;

  for (let i = 0; i < 40; i++) {
    try {
      // Any response (even 400 Invalid Signature) counts as a hit on the limiter.
      await axios.post(API_URL, {}, { headers: { 'x-razorpay-signature': 'test' } });
      successCount++;
    } catch (err: any) {
      if (err.response?.status === 429) {
        console.log(`✅ SUCCESS: Request ${i + 1} blocked with 429 after ${i} attempts.`);
        blocked = true;
        break;
      }
      // If it's not a 429, it's still a hit that the limiter should count.
      successCount++;
    }
  }

  if (blocked) {
    process.exit(0);
  } else {
    console.error('❌ VULNERABILITY FOUND: Rate limiter did not block requests!', successCount);
    process.exit(1);
  }
}

run();

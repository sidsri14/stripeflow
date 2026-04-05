/// <reference types="node" />
import axios from 'axios';
import process from 'process';

async function test() {
  try {
    console.log('--- Starting Billing & Plan Tests ---');

    let cookies: string[] = [];
    
    // 1. Get CSRF Token
    const csrfRes = await axios.get('http://localhost:3000/api/csrf-token');
    const csrfToken = csrfRes.data.token;
    const cookieHeader = (csrfRes.headers['set-cookie'] || []).find(c => c.startsWith('csrf-token='))?.split(';')[0] || '';
    
    console.log('✓ CSRF Token obtained:', csrfToken);
    console.log('✓ Cookie obtained:', cookieHeader);

    // 2. Register a new user
    const email = `billing-tester-${Date.now()}@recoverpay.com`;
    const password = 'Password123!';
    const regRes = await axios.post('http://localhost:3000/api/auth/register', {
      email, password, name: 'Billing Tester'
    }, {
      headers: { 'x-csrf-token': csrfToken, 'Cookie': cookieHeader }
    });
    
    const regAuthCookie = (regRes.headers['set-cookie'] || []).find(c => c.startsWith('token='))?.split(';')[0] || '';
    const combinedCookie = `${cookieHeader}; ${regAuthCookie}`;
    
    console.log('✓ Registered Free user:', email);

    // 3. Upgrade to Pro
    const upgradeRes = await axios.patch('http://localhost:3000/api/billing/plan', {
      plan: 'pro'
    }, {
      headers: { 'x-csrf-token': csrfToken, 'Cookie': combinedCookie }
    });
    console.log('✓ Upgraded to Pro. Current Plan:', upgradeRes.data.data.user.plan);

    if (upgradeRes.data.data.user.plan !== 'pro') {
      throw new Error('Upgrade failed: Plan mismatch');
    }

    // 4. Downgrade to Free
    const downgradeRes = await axios.patch('http://localhost:3000/api/billing/plan', {
      plan: 'free'
    }, {
      headers: { 'x-csrf-token': csrfToken, 'Cookie': combinedCookie }
    });
    console.log('✓ Downgraded to Free. Current Plan:', downgradeRes.data.data.user.plan);

    if (downgradeRes.data.data.user.plan !== 'free') {
      throw new Error('Downgrade failed: Plan mismatch');
    }

    console.log('--- All Billing Tests Passed ---');
  } catch (err: any) {
    console.error('✗ Test failed:', err.response?.data || err.message);
    process.exit(1);
  }
}

test();

/// <reference types="node" />
import axios from 'axios';
import process from 'process';

// Automated Settings Test Script


async function test() {
  try {
    console.log('--- Starting Settings Tests ---');

    let cookies: string[] = [];
    
    // 1. Get CSRF Token
    const csrfRes = await axios.get('http://localhost:3000/api/csrf-token');
    const csrfToken = csrfRes.data.token;
    cookies = csrfRes.headers['set-cookie'] || [];
    const csrfCookie = cookies.find(c => c.startsWith('csrf-token='));
    const cookieHeader = csrfCookie ? csrfCookie.split(';')[0] : '';
    
    console.log('✓ CSRF Token obtained:', csrfToken);
    console.log('✓ Cookie obtained:', cookieHeader);

    // 2. Register a new user
    const email = `tester-${Date.now()}@recoverpay.com`;
    const password = 'Password123!';
    const registerRes = await axios.post('http://localhost:3000/api/auth/register', {
      email,
      password,
      name: 'Initial Name'
    }, {
      headers: { 
        'x-csrf-token': csrfToken,
        'Cookie': cookieHeader
      }
    });
    
    // Save new cookies (auth token)
    const newCookies = registerRes.headers['set-cookie'] || [];
    const authCookie = newCookies.find(c => c.startsWith('token='));
    const combinedCookie = [cookieHeader, authCookie ? authCookie.split(';')[0] : ''].filter(Boolean).join('; ');
    
    console.log('✓ User registered:', email);
    console.log('✓ Auth Cookie obtained');

    // 3. Verify 'me' endpoint
    const meRes = await axios.get('http://localhost:3000/api/auth/me', {
      headers: { 'Cookie': combinedCookie }
    });
    console.log('✓ Auth verified. Current User:', meRes.data.data.name);

    // 4. Test Profile Update
    const newName = 'Updated Tester Name';
    const profileRes = await axios.patch('http://localhost:3000/api/auth/profile', {
      name: newName
    }, {
      headers: { 
        'x-csrf-token': csrfToken,
        'Cookie': combinedCookie
      }
    });
    console.log('✓ Profile updated to:', profileRes.data.data.user.name);


    if (profileRes.data.data.user.name !== newName) {
      throw new Error('Profile update failed: Name mismatch');
    }

    // 5. Test Password Update
    const newPassword = 'NewPassword789!';
    const passRes = await axios.patch('http://localhost:3000/api/auth/password', {
      oldPassword: password,
      newPassword: newPassword
    }, {
      headers: { 
        'x-csrf-token': csrfToken,
        'Cookie': combinedCookie
      }
    });
    console.log('✓ Password updated successfully');

    // 6. Verify login with NEW password
    const loginCsrfRes = await axios.get('http://localhost:3000/api/csrf-token');
    const loginCsrfToken = loginCsrfRes.data.token;
    const loginCsrfCookie = (loginCsrfRes.headers['set-cookie'] || []).find(c => c.startsWith('csrf-token='));
    const loginCookieHeader = loginCsrfCookie ? loginCsrfCookie.split(';')[0] : '';

    const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
      email,
      password: newPassword
    }, {
      headers: { 
        'x-csrf-token': loginCsrfToken,
        'Cookie': loginCookieHeader
      }
    });
    console.log('✓ Login with new password successful');

    console.log('--- All Settings Tests Passed ---');
  } catch (err: any) {
    console.error('✗ Test failed:', err.response?.data || err.message);
    process.exit(1);
  }
}

test();


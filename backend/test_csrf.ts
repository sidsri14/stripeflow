/// <reference types="node" />
import axios from 'axios';
import process from 'process';

async function test() {
  try {
    console.log('--- Starting CSRF Protection Tests ---');

    console.log('1. Attempting login without CSRF header (should fail)...');
    try {
      await axios.post('http://localhost:3000/api/auth/register', {
        email: 'csrf-tester-' + Date.now() + '@test.com',
        password: 'Password123!',
      });
      console.error('✗ CSRF Bypass vulnerability found! (no header)');
      process.exit(1);
    } catch (err: any) {
      if (err.response?.status === 403) {
        console.log('✓ Request rejected with 403 as expected');
      } else {
        console.error('✗ Unexpected error status:', err.response?.status || err.message);
        process.exit(1);
      }
    }

    console.log('2. Attempting logout with mismatched CSRF header (should fail)...');
    try {
      await axios.post('http://localhost:3000/api/auth/logout', {}, {
        headers: { 
          'x-csrf-token': 'mismatched-token',
          'Cookie': 'csrf-token=actual-token-but-mismatched'
        }
      });
      console.error('✗ CSRF Bypass vulnerability found! (mismatched)');
      process.exit(1);
    } catch (err: any) {
      if (err.response?.status === 403) {
        console.log('✓ Request rejected with 403 as expected');
      } else {
        console.error('✗ Unexpected error status:', err.response?.status || err.message);
        process.exit(1);
      }
    }

    console.log('--- All CSRF Tests Passed ---');
  } catch (err: any) {
    console.error('✗ Unexpected test failure:', err.message);
    process.exit(1);
  }
}

test();

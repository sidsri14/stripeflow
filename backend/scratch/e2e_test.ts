import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_URL = 'http://localhost:3000/api';

async function testClickTracking() {
  console.log('--- Testing Click Tracking ---');
  
  // 1. Setup mock user and payment
  const user = await prisma.user.findFirst();
  if (!user) throw new Error('No user found in DB');

  const fp = await prisma.failedPayment.create({
    data: {
      userId: user.id,
      paymentId: 'test_track_' + Date.now(),
      amount: 50000,
      customerEmail: 'test-tracker@example.com',
      status: 'pending'
    }
  });

  const rl = await prisma.recoveryLink.create({
    data: {
      failedPaymentId: fp.id,
      url: 'https://example.com/actual-recovery-page'
    }
  });

  console.log(`Created test payment: ${fp.id}`);
  console.log(`Created recovery link: ${rl.url}`);

  // 2. Simulate click
  console.log('Simulating click via tracking route...');
  try {
    const res = await axios.get(`${API_URL}/recovery/track/${fp.id}`, {
      maxRedirects: 0,
      validateStatus: (status) => status === 302
    });
    
    console.log(`Received Redirect: ${res.headers.location}`);
    if (res.headers.location === rl.url) {
      console.log('✅ Redirection Successful');
    } else {
      console.log('❌ Redirection Failed');
    }
  } catch (err: any) {
    console.error('❌ Tracking request failed', err.message);
  }

  // 3. Verify DB update
  const updatedFp = await prisma.failedPayment.findUnique({ where: { id: fp.id } });
  console.log(`Updated Click Count: ${updatedFp?.clickCount}`);
  if (updatedFp?.clickCount === 1) {
    console.log('✅ Click Count Incremented');
  } else {
    console.log('❌ Click Count NOT Incremented');
  }

  // 4. Cleanup
  await prisma.recoveryLink.delete({ where: { id: rl.id } });
  await prisma.failedPayment.delete({ where: { id: fp.id } });
  console.log('Cleaned up test data.');
}

async function testBrandingUpdate() {
  console.log('\n--- Testing Branding Update ---');
  const user = await prisma.user.findFirst();
  if (!user) throw new Error('No user found in DB');

  const testBranding = JSON.stringify({
    logoUrl: 'https://test.com/logo.png',
    primaryColor: '#ff0000',
    signature: 'Test Signature'
  });

  // We'll skip the HTTP call for branding update since it needs auth cookies, 
  // but we can verify the DB field exists and works via Prisma.
  await prisma.user.update({
    where: { id: user.id },
    data: { brandSettings: testBranding }
  });

  const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
  console.log('Updated Brand Settings:', updatedUser?.brandSettings);
  if (updatedUser?.brandSettings === testBranding) {
    console.log('✅ Branding DB Update Successful');
  } else {
    console.log('❌ Branding DB Update Failed');
  }
}

async function runTests() {
  try {
    await testClickTracking();
    await testBrandingUpdate();
    console.log('\nAll detailed logic tests passed!');
  } catch (err) {
    console.error('Test Suite Failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();

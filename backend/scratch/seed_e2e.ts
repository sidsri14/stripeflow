import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seed() {
  console.log('Seeding mock data for E2E testing...');
  
  const email = 'test-e2e-' + Date.now() + '@payrecover.com';
  const hashedPassword = await bcrypt.hash('Password123!', 10);

  const user = await prisma.user.create({
    data: {
      email,
      name: 'E2E Tester',
      password: hashedPassword,
      plan: 'pro'
    }
  });

  console.log(`Created test user: ${user.email} (ID: ${user.id})`);
  return user.id;
}

seed().catch(console.error).finally(() => prisma.$disconnect());

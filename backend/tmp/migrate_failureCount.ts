import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRaw`ALTER TABLE "Monitor" ADD COLUMN IF NOT EXISTS "failureCount" INTEGER DEFAULT 0;`;
    console.log('SUCCESS: failureCount column added/verified.');
  } catch (err) {
    console.error('ERROR during migration:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();

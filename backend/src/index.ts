import { app } from './app.js';
import { prisma } from './utils/prisma.js';

const port = process.env.PORT || 3000;

const REQUIRED_ENV = ['JWT_SECRET', 'ENCRYPTION_KEY', 'DATABASE_URL'] as const;
function validateEnv(): void {
  const missing = REQUIRED_ENV.filter(k => !process.env[k]);
  if (missing.length > 0) {
    console.error(`[Startup] Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}
validateEnv();

const server = app.listen(port, () => {
  console.log(`PayRecover server running on port ${port}`);
});

// ── Graceful Shutdown
const shutdown = async (signal: string) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  // 1. Stop accepting new requests
  server.close(() => {
    console.log('HTTP server closed.');
  });

  try {
    // 2. Disconnect from DB
    await prisma.$disconnect();
    console.log('Prisma disconnected.');
    
    // Give inflight operations a moment to finish
    setTimeout(() => {
      console.log('Graceful shutdown complete.');
      process.exit(0);
    }, 1000);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

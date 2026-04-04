import { redisConnection } from './src/jobs/recovery.queue.js';
import 'dotenv/config';

async function check() {
  try {
    const pong = await redisConnection.ping();
    console.log('Redis Ping:', pong);
    process.exit(0);
  } catch (err) {
    console.error('Redis connection failed:', err);
    process.exit(1);
  }
}

check();

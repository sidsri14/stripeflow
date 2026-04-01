import type { Request, Response } from 'express';
import { prisma } from '../utils/prisma.js';

export const getHealth = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check DB connection health
    await prisma.$queryRaw`SELECT 1`;
    
    res.status(200).json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      service: 'PayRecover-API',
      uptime: process.uptime(),
      db: 'CONNECTED'
    });
  } catch (err) {
    res.status(503).json({
      status: 'DOWN',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed'
    });
  }
};

import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.js';

export type AuthRequest = Request & {
  userId?: string;
};

export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];
  
  if (!token) {
    res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
    return;
  }

  try {
    const decoded = verifyToken(token);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
  }
};

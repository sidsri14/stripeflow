import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';

/**
 * Validates the double-submit CSRF pattern:
 * 1. Server sets a non-HttpOnly `csrf-token` cookie on first visit.
 * 2. Client reads it and echoes it back in the `x-csrf-token` request header.
 * 3. This middleware confirms the cookie and header values match.
 *
 * Combined with SameSite=Strict cookies (the auth JWT), this provides two
 * independent layers of CSRF protection.
 *
 * Uses timingSafeEqual to prevent timing-based token enumeration.
 */
export const csrfCheck = (req: Request, res: Response, next: NextFunction): void => {
  const cookieToken = req.cookies?.['csrf-token'];
  const headerToken = String(req.headers['x-csrf-token'] ?? '');

  const valid = cookieToken &&
    headerToken.length > 0 &&
    cookieToken.length === headerToken.length &&
    crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken));

  if (!valid) {
    res.status(403).json({ success: false, error: 'Invalid CSRF token' });
    return;
  }
  next();
};

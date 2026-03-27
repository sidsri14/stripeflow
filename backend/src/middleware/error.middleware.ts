import type { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  // Fix P1: Remove duplicate logging
  console.error(`[Error] ${err.message}`, { stack: err.stack });
  
  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';
  const exposeErrorDetails = process.env.DEBUG_ERRORS === 'true';

  // Error hygiene: by default only expose explicit 4xx messages.
  const message = statusCode >= 500 && !exposeErrorDetails
    ? 'Internal Server Error'
    : err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    error: message,
  });
};

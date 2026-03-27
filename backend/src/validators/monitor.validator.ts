import { z } from 'zod';

export const createMonitorSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name too long'),
  url: z.string().url('Invalid endpoint URL').startsWith('http', 'Only http/https protocols are allowed'),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'PATCH']).default('GET'),
  interval: z.coerce.number().min(10, 'Minimum interval is 10s').max(86400, 'Maximum interval is 24h').default(60),
});

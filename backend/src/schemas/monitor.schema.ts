import { z } from 'zod';

export const MonitorSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name too long'),
  url: z.string().url('Invalid URL format').refine((val) => val.startsWith('http'), 'Only HTTP/HTTPS is allowed'),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'PATCH']).default('GET'),
  interval: z.number().min(10, 'Minimum interval is 10s').max(86400, 'Maximum interval is 24h').default(60),
});

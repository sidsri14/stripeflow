import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { doubleCsrf } from 'csrf-csrf';
import authRoutes from './routes/auth.routes.js';
import webhookRoutes from './routes/webhook.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import sourceRoutes from './routes/source.routes.js';
import demoRoutes from './routes/demo.routes.js';
import billingRoutes from './routes/billing.routes.js';
import { errorHandler } from './middleware/error.middleware.js';
import { rateLimit } from 'express-rate-limit';
import { successResponse } from './utils/apiResponse.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required.');
}
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required.');
}

const app = express();
const port = process.env.PORT || 3000;

app.use(helmet());
app.use(cookieParser(process.env.COOKIE_SECRET || process.env.JWT_SECRET));

// CRITICAL: Webhook route MUST be registered before express.json()
// so it receives the raw body buffer for HMAC-SHA256 signature verification.
// It is also registered before CSRF middleware — correct, since Razorpay
// authenticates via HMAC signature, not CSRF tokens.
app.use('/api/webhooks/razorpay', webhookRoutes);

// Global JSON body parser (after webhook route)
app.use(express.json({ limit: '10kb' }));

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token'],
}));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many auth attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

const { generateCsrfToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => process.env.JWT_SECRET as string,
  getSessionIdentifier: (req) => req.ip ?? '',
  cookieName: 'x-csrf-token',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  },
  getCsrfTokenFromRequest: (req) => req.headers['x-csrf-token'] as string,
});

app.get('/api/csrf-token', (req, res) => {
  const token = generateCsrfToken(req, res);
  res.json({ token });
});

app.use('/api', doubleCsrfProtection);

app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/sources', sourceRoutes);
app.use('/api/demo', demoRoutes);
app.use('/api/billing', billingRoutes);

app.get('/health', (_req, res) => {
  successResponse(res, { status: 'ok', service: 'RecoverPay' });
});

// Serve frontend static files in production
const distPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(distPath));

app.use((_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.use(errorHandler);

app.listen(port, () => {
  console.log(`RecoverPay server running on port ${port}`);
});

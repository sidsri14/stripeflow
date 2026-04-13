import { Router } from 'express';
import { getPayments, getPayment, manualRetry, exportPayments } from '../controllers/payment.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { apiLimiter } from '../middleware/rateLimit.middleware.js';
import { csrfCheck } from '../middleware/csrf.middleware.js';

const router = Router();

router.get('/', requireAuth, apiLimiter, getPayments);
router.get('/export', requireAuth, exportPayments);
router.get('/:id', requireAuth, apiLimiter, getPayment);
router.post('/:id/retry', csrfCheck, requireAuth, apiLimiter, manualRetry);

export default router;

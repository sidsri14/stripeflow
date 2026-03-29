import { Router } from 'express';
import { getBillingStatus, upgradeToPaid } from '../controllers/billing.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { apiLimiter } from '../middleware/rateLimit.middleware.js';

const router = Router();

router.use(requireAuth, apiLimiter);

router.get('/status', getBillingStatus);
router.post('/upgrade', upgradeToPaid);

export default router;

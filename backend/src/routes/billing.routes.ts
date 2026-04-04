import { Router } from 'express';
import { createSubscription, updatePlan } from '../controllers/billing.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { csrfCheck } from '../middleware/csrf.middleware.js';

const router = Router();

// Protected routes — csrfCheck + requireAuth per-route (avoids Express 5 router.use() edge case)
router.post('/create-subscription', csrfCheck, requireAuth, createSubscription);
router.patch('/plan', csrfCheck, requireAuth, updatePlan);

export default router;

import { Router } from 'express';
import { createSubscription, updatePlan } from '../controllers/billing.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// Protected routes — requireAuth applied per-route to avoid Express 5 router.use() edge cases
router.post('/create-subscription', requireAuth, createSubscription);
router.patch('/plan', requireAuth, updatePlan);

export default router;

import { Router } from 'express';
import { createSubscription, updatePlan, getSubscriptionStatus } from '../controllers/billing.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { csrfCheck } from '../middleware/csrf.middleware.js';
import { validateRequest } from '../middleware/validate.middleware.js';
import { createSubscriptionSchema, updatePlanSchema } from '../validators/billing.validator.js';

const router = Router();

// Protected routes — csrfCheck + requireAuth per-route (avoids Express 5 router.use() edge case)
router.get('/current', requireAuth, getSubscriptionStatus);
router.post('/create-subscription', csrfCheck, requireAuth, validateRequest(createSubscriptionSchema), createSubscription);
router.post('/create-checkout', csrfCheck, requireAuth, validateRequest(createSubscriptionSchema), createSubscription);
router.patch('/plan', csrfCheck, requireAuth, validateRequest(updatePlanSchema), updatePlan);

export default router;

import { Router } from 'express';
import { simulateFailure, simulateRecovery } from '../controllers/demo.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { rateLimit } from 'express-rate-limit';

const router = Router();

// Strict rate limit for demo — prevent abuse
const demoLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many demo requests' },
});

router.use(requireAuth, demoLimiter);

router.post('/simulate-failure', simulateFailure);
router.post('/:id/recover', simulateRecovery);

export default router;

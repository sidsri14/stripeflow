import { Router } from 'express';
import { simulateFailure } from '../controllers/demo.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { csrfCheck } from '../middleware/csrf.middleware.js';

const router = Router();

router.post('/simulate-failure', csrfCheck, requireAuth, simulateFailure);

export default router;

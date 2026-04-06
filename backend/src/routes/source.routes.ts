import { Router } from 'express';
import { connectSource, getSources, deleteSource, testConnection } from '../controllers/source.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { csrfCheck } from '../middleware/csrf.middleware.js';
import { apiLimiter } from '../middleware/rateLimit.middleware.js';

const router = Router();

router.post('/connect', csrfCheck, requireAuth, apiLimiter, connectSource);
router.post('/test-connection', csrfCheck, requireAuth, apiLimiter, testConnection);
router.get('/', requireAuth, apiLimiter, getSources);
router.delete('/:id', csrfCheck, requireAuth, apiLimiter, deleteSource);

export default router;

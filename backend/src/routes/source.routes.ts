import { Router } from 'express';
import { connectSource, getSources, deleteSource } from '../controllers/source.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { rateLimit } from 'express-rate-limit';

const router = Router();

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(requireAuth, apiLimiter);

router.post('/connect', connectSource);
router.get('/', getSources);
router.delete('/:id', deleteSource);

export default router;

import { Router } from 'express';
import { submitContact } from '../controllers/contact.controller.js';
import { csrfCheck } from '../middleware/csrf.middleware.js';
import { authLimiter } from '../middleware/rateLimit.middleware.js';
import { validateRequest } from '../middleware/validate.middleware.js';
import { contactSchema } from '../validators/contact.validator.js';

const router = Router();

// Public route — CSRF protected + rate-limited
router.post('/', csrfCheck, authLimiter, validateRequest(contactSchema), submitContact);

export default router;

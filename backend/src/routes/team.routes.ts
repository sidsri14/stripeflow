import { Router } from 'express';
import { getMyOrganizations, createOrganization, getOrgMembers, inviteUser } from '../controllers/team.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { apiLimiter } from '../middleware/rateLimit.middleware.js';
import { csrfCheck } from '../middleware/csrf.middleware.js';

const router = Router();

router.get('/my', requireAuth, apiLimiter, getMyOrganizations);
router.post('/', csrfCheck, requireAuth, apiLimiter, createOrganization);
router.get('/:orgId/members', requireAuth, apiLimiter, getOrgMembers);
router.post('/:orgId/invite', csrfCheck, requireAuth, apiLimiter, inviteUser);

export default router;

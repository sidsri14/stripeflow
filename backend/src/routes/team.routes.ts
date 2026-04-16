import { Router } from 'express';
import {
  getMyOrganizations,
  createOrganization,
  getOrgMembers,
  inviteUser,
  updateMember,
  removeMember,
  updateOrganization,
} from '../controllers/team.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { planAwareLimiter } from '../middleware/rateLimit.middleware.js';
import { csrfCheck } from '../middleware/csrf.middleware.js';
import { validateRequest } from '../middleware/validate.middleware.js';
import { createOrganizationSchema, inviteUserSchema } from '../validators/team.validator.js';

const router = Router();

router.get('/my', requireAuth, planAwareLimiter, getMyOrganizations);
router.post('/', csrfCheck, requireAuth, planAwareLimiter, validateRequest(createOrganizationSchema), createOrganization);
router.get('/:orgId/members', requireAuth, planAwareLimiter, getOrgMembers);
router.post('/:orgId/invite', csrfCheck, requireAuth, planAwareLimiter, validateRequest(inviteUserSchema), inviteUser);
router.patch('/:orgId/members/:userId', csrfCheck, requireAuth, planAwareLimiter, updateMember);
router.delete('/:orgId/members/:userId', csrfCheck, requireAuth, planAwareLimiter, removeMember);
router.patch('/:orgId', csrfCheck, requireAuth, planAwareLimiter, updateOrganization);

export default router;

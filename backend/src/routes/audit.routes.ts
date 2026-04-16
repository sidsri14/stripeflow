import { Router } from 'express';
import { getAuditLogs, exportAuditLogs } from '../controllers/audit.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/audit-logs', requireAuth, getAuditLogs);
router.get('/audit-logs/export', requireAuth, exportAuditLogs);

export default router;

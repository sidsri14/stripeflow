import { Router } from 'express';
import { createMonitor, getMonitors, getMonitor, deleteMonitor } from '../controllers/monitor.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth); // Protect all routes below

router.post('/', createMonitor);
router.get('/', getMonitors);
router.get('/:id', getMonitor);
router.delete('/:id', deleteMonitor);

export default router;

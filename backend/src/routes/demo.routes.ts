import { Router } from 'express';
import { DemoController } from '../controllers/demo.controller.js';

const router = Router();

router.get('/invoice/:id', DemoController.getInvoice);
router.post('/pay/:id', DemoController.payInvoice);

export default router;

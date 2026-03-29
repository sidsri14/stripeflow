import { Router } from 'express';
import express from 'express';
import { handleRazorpayWebhook } from '../controllers/webhook.controller.js';

const router = Router({ mergeParams: true });

router.post('/:sourceId', express.raw({ type: 'application/json' }), handleRazorpayWebhook);

export default router;

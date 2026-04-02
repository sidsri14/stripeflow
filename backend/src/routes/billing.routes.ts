import { Router } from 'express';
import express from 'express';
import { createSubscription, billingWebhook } from '../controllers/billing.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// Platform Billing Webhook (Public, signature-verified)
// This must be placed ABOVE the requireAuth middleware
router.post('/webhook', express.raw({ type: 'application/json', limit: '100kb' }), billingWebhook);

// Protected routes
router.use(requireAuth);
router.post('/create-subscription', createSubscription);

export default router;

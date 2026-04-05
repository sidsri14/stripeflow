import type { Request, Response } from 'express';
import pino from 'pino';
import { RazorpayService } from '../services/RazorpayService.js';
import { markPaymentRecovered } from '../services/payment.service.js';
import { getSourceWithSecrets } from '../services/source.service.js';
import { logAuditAction } from '../services/audit.service.js';
import { prisma } from '../utils/prisma.js';
import { enqueueRecoveryJob } from '../jobs/recovery.queue.js';

const logger = pino({ transport: { target: 'pino-pretty', options: { colorize: true } } });

/**
 * Handle incoming Razorpay Webhooks.
 * Day 3 of MVP Roadmap Implementation.
 */
export const handleRazorpayWebhook = async (req: Request, res: Response) => {
  const { sourceId } = req.params;
  const sig = req.headers['x-razorpay-signature'];
  
  if (typeof sig !== 'string') {
    logger.warn({ sourceId }, 'Webhook rejected: Missing signature');
    return res.status(400).json({ error: 'Missing signature' });
  }

  const source = await getSourceWithSecrets(String(sourceId || ''));
  if (!source) {
    logger.warn({ sourceId }, 'Webhook rejected: Unknown source');
    return res.status(404).json({ error: 'Unknown source' });
  }

  // Raw body is required for signature verification
  const rawBody = (req.body as Buffer).toString('utf8');
  
  const isValid = await RazorpayService.verifyWebhookSignature(
    rawBody, 
    sig, 
    source.webhookSecret
  );

  if (!isValid) {
    let paymentId: string | undefined;
    try { paymentId = JSON.parse(rawBody).payload?.payment?.entity?.id; } catch { /* malformed body */ }
    logger.warn({ sourceId, paymentId }, 'Webhook rejected: Invalid signature');
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const event = JSON.parse(rawBody);
  try {
    if (event.event === 'payment.failed') {
      await handleFail(source.id, source.userId, event);
    } else if (event.event === 'payment.captured') {
      await handleCapture(source.userId, event.payload?.payment?.entity);
    }
  } catch (err) {
    logger.error({ err, eventId: event.id }, 'Error processing webhook event');
  }

  res.json({ received: true });
};

const handleFail = async (srcId: string, uId: string, ev: any) => {
  const p = ev.payload?.payment?.entity;
  if (!p?.id || !p?.email) return;

  const rEventId = ev.id || `${p.id}_${ev.created_at || Date.now()}`;
  if (await prisma.paymentEvent.findUnique({ where: { razorpayEventId: rEventId } })) return;

  await prisma.$transaction(async (tx) => {
    const pEvent = await tx.paymentEvent.create({
      data: { sourceId: srcId, razorpayEventId: rEventId, eventType: 'payment.failed', paymentId: p.id, amount: p.amount, email: p.email, contact: p.contact, status: 'failed', rawData: JSON.stringify(p) },
    });

    if (!(await tx.failedPayment.findUnique({ where: { paymentId: p.id } }))) {
      const fp = await tx.failedPayment.create({
        data: { userId: uId, paymentId: p.id, orderId: p.order_id, amount: p.amount, currency: p.currency || 'INR', customerEmail: p.email, customerPhone: p.contact, customerName: p.notes?.name, metadata: JSON.stringify(p), eventId: pEvent.id, nextRetryAt: new Date() },
      });
      // Fire-and-forget: enqueue outside transaction so the webhook response isn't blocked
      void enqueueRecoveryJob(fp.id).catch((err) =>
        logger.error({ failedPaymentId: fp.id, err }, 'Job enqueue failed — Redis may be down')
      );
    }
  });

  await logAuditAction(uId, 'PAYMENT_FAILED_RECEIVED', 'FailedPayment', p.id, { amount: p.amount });
};

const handleCapture = async (uId: string, p: any) => {
  if (!p?.id) return;
  const f = await prisma.failedPayment.findFirst({ where: { userId: uId, status: { in: ['pending', 'retrying'] }, OR: [{ paymentId: p.id }, ...(p.order_id ? [{ orderId: p.order_id }] : [])] } });
  if (!f) return;

  await markPaymentRecovered(f.id, uId);
  await logAuditAction(uId, 'PAYMENT_RECOVERED', 'FailedPayment', f.id, { recoveredId: p.id });
};

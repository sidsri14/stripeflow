import type { Request, Response } from 'express';
import pino from 'pino';
import { RazorpayService } from '../services/razorpay.service.js';
import { PaymentService } from '../services/payment.service.js';
import { SourceService } from '../services/source.service.js';
import { AuditService } from '../services/audit.service.js';
import { prisma } from '../utils/prisma.js';

const logger = pino({ transport: { target: 'pino-pretty', options: { colorize: true } } });

export const handleRazorpayWebhook = async (req: Request, res: Response): Promise<void> => {
  const sourceId = req.params['sourceId'] as string;
  const signature = req.headers['x-razorpay-signature'] as string | undefined;

  if (!signature) {
    res.status(400).json({ error: 'Missing signature' });
    return;
  }

  // Look up the PaymentSource to get its webhookSecret
  const source = await SourceService.getSourceWithSecrets(sourceId);
  if (!source) {
    res.status(404).json({ error: 'Unknown source' });
    return;
  }

  const rawBody = (req.body as Buffer).toString('utf8');

  if (!RazorpayService.verifyWebhookSignature(rawBody, signature, source.webhookSecret)) {
    logger.warn({ sourceId }, 'Webhook signature verification failed — possible replay or misconfigured secret');
    res.status(400).json({ error: 'Invalid signature' });
    return;
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  try {
    if (event.event === 'payment.failed') {
      logger.info({ sourceId, eventId: event.id }, 'Processing payment.failed event');
      await handlePaymentFailed(source.id, source.userId, event);
    } else if (event.event === 'payment.captured') {
      logger.info({ sourceId, eventId: event.id }, 'Processing payment.captured event');
      await handlePaymentCaptured(source.userId, event.payload?.payment?.entity);
    } else if (event.event === 'refund.created' || event.event === 'payment.refunded') {
      await handlePaymentRefunded(source.userId, event.payload?.refund?.entity ?? event.payload?.payment?.entity);
    }
  } catch (err) {
    logger.error({ sourceId, err, eventId: event.id }, 'Webhook internal processing error — signed event acknowledged with 200 to prevent retries');
    res.status(200).json({ received: true, error: 'Internal processing error' });
    return;
  }
  
  res.status(200).json({ received: true });
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const handlePaymentFailed = async (sourceId: string, userId: string, event: any): Promise<void> => {
  const payment = event.payload?.payment?.entity;
  if (!payment?.id || !payment?.email) {
    logger.warn({ sourceId, eventId: event.id, paymentId: payment?.id, email: payment?.email }, 'Missing critical fields in payment.failed payload — skipping processing');
    return;
  }

  // Validate email format to prevent header injection in outbound emails
  if (!EMAIL_REGEX.test(String(payment.email))) {
    logger.warn({ sourceId, paymentId: payment.id, email: payment.email }, 'Invalid email format in webhook payload — skipping');
    return;
  }

  // Reject nonsensical amounts to prevent corrupted recovery calculations
  if (typeof payment.amount !== 'number' || payment.amount <= 0 || payment.amount > 999_999_999) {
    logger.warn({ sourceId, paymentId: payment.id, amount: payment.amount }, 'Invalid payment amount in webhook payload — skipping');
    return;
  }

  // Idempotency: skip if this event was already processed.
  // Prefer event.id (Razorpay's own unique event ID). Fall back to a composite
  // key using all available discriminating fields — avoids collision when
  // account_id is missing (e.g. test webhooks).
  const razorpayEventId = event.id
    ?? (event.account_id
      ? `${event.account_id}_${event.created_at}_${payment.id}_failed`
      : `${payment.id}_${event.created_at ?? 'failed'}`);

  const existingEvent = await prisma.paymentEvent.findUnique({
    where: { razorpayEventId },
  });
  if (existingEvent) {
    logger.info({ razorpayEventId }, 'Event already processed — skipping (idempotency)');
    return;
  }

  logger.info({ razorpayEventId }, 'Atomically storing raw event and creating FailedPayment');
  
  await prisma.$transaction(async (tx) => {
    // 1. Double check idempotency within transaction (optional but safer)
    const existingEvent = await tx.paymentEvent.findUnique({ where: { razorpayEventId } });
    if (existingEvent) return;

    // 2. Store raw event
    const paymentEvent = await tx.paymentEvent.create({
      data: {
        sourceId,
        razorpayEventId,
        eventType: 'payment.failed',
        paymentId: payment.id,
        amount: payment.amount,
        email: payment.email,
        contact: payment.contact ?? null,
        status: payment.status || 'failed',
        rawData: JSON.stringify(payment),
      },
    });

    // 3. Create FailedPayment
    const existingPayment = await tx.failedPayment.findUnique({ where: { paymentId: payment.id } });
    if (!existingPayment) {
      await tx.failedPayment.create({
        data: {
          userId,
          paymentId: payment.id,
          orderId: payment.order_id,
          amount: payment.amount,
          currency: payment.currency || 'INR',
          customerEmail: payment.email,
          customerPhone: payment.contact ?? null,
          customerName: payment.notes?.name,
          metadata: JSON.stringify(payment),
          eventId: paymentEvent.id,
          nextRetryAt: new Date(),
        },
      });
    }
  });

  logger.info({ paymentId: payment.id }, 'Webhook processed successfully');

  await AuditService.log(userId, 'PAYMENT_FAILED_RECEIVED', 'FailedPayment', payment.id, {
    amount: payment.amount,
    email: payment.email,
  });
};

const handlePaymentCaptured = async (userId: string, payment: any): Promise<void> => {
  if (!payment?.id) return;

  const failed = await prisma.failedPayment.findFirst({
    where: {
      userId,  // only match payments belonging to this source's owner
      status: { in: ['pending', 'retrying'] },
      OR: [
        { paymentId: payment.id },
        ...(payment.order_id ? [{ orderId: payment.order_id }] : []),
      ],
    },
  });
  if (!failed) return;

  await PaymentService.markRecovered(failed.id);
  await AuditService.log(userId, 'PAYMENT_RECOVERED', 'FailedPayment', failed.id, {
    recoveredPaymentId: payment.id,
  });
};

const handlePaymentRefunded = async (userId: string, refund: any): Promise<void> => {
  if (!refund?.payment_id && !refund?.id) return;

  // Match via original payment ID (refund entity has payment_id) or payment ID itself
  const paymentId = refund.payment_id ?? refund.id;

  const failed = await prisma.failedPayment.findFirst({
    where: {
      userId,
      paymentId,
    },
  });
  if (!failed) return;

  // If it was already recovered, revert it to abandoned so the dashboard reflects the refund
  if (failed.status === 'recovered') {
    await prisma.failedPayment.update({
      where: { id: failed.id },
      data: { status: 'abandoned', recoveredAt: null, recoveredVia: null },
    });
    await AuditService.log(userId, 'PAYMENT_REFUNDED', 'FailedPayment', failed.id, {
      refundId: refund.id,
      amount: refund.amount,
    });
    logger.info({ paymentId, refundId: refund.id }, 'Payment refunded — status reverted from recovered to abandoned');
  }
};

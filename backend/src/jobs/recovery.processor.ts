import type { Job } from 'bullmq';
import pino from 'pino';
import { prisma } from '../utils/prisma.js';
import { RazorpayService } from '../services/RazorpayService.js';
import { getPaymentLink } from '../services/razorpay.service.js';
import { getSourceWithSecrets } from '../services/source.service.js';
import { EmailService } from '../services/EmailService.js';
import { recoveryQueue } from './recovery.queue.js';
import { RETRY_DELAYS_MS } from '../services/payment.service.js';

const logger = pino({ transport: { target: 'pino-pretty', options: { colorize: true } } });

export interface RecoveryJobData {
  failedPaymentId: string;
}

/**
 * BullMQ Processor for payment recovery jobs.
 * Day 1-2 of MVP Roadmap Implementation.
 */
export async function processRecoveryJob(job: Job<RecoveryJobData>): Promise<void> {
  const { failedPaymentId } = job.data;

  // 1. Eligibility & Race Condition Guard
  const payment = await prisma.failedPayment.findUnique({
    where: { id: failedPaymentId },
    include: { user: true, event: { select: { sourceId: true } } },
  });

  if (!payment || payment.status === 'recovered' || payment.status === 'abandoned') {
    logger.info({ failedPaymentId }, 'Payment no longer eligible — skipping');
    return;
  }

  // 2. Plan-based Guard (only starter/pro processed)
  if (payment.user.plan === 'free') {
    logger.info({ failedPaymentId, userId: payment.userId }, 'Skipping recovery for Free plan user');
    return;
  }

  // 3. Advisory Lock
  await prisma.failedPayment.update({
    where: { id: failedPaymentId },
    data: { lockedAt: new Date(), status: 'retrying' }
  });

  try {
    // 3. Create/Fetch Recovery Link using per-source credentials when available.
    // Demo payments (no eventId/sourceId) fall back to global Razorpay env credentials.
    let link: string | null = null;
    const sourceId = payment.event?.sourceId;
    if (sourceId) {
      const source = await getSourceWithSecrets(sourceId);
      if (source) {
        link = await getPaymentLink(source.keyId, source.keySecret, {
          amount: payment.amount,
          currency: payment.currency,
          customerName: payment.customerName,
          customerEmail: payment.customerEmail,
          customerPhone: payment.customerPhone,
          referenceId: payment.id,
          description: `Recovery for ${payment.paymentId}`,
        });
      }
    }
    if (!link) {
      // Fallback: use global Razorpay credentials (for demo payments or missing source)
      link = await RazorpayService.createPaymentLink(payment);
    }

    if (!link) {
      // Both link generation paths failed (e.g. invalid test credentials).
      // Release the lock and let BullMQ retry the job rather than storing a null URL.
      logger.warn({ failedPaymentId }, 'Failed to generate recovery link — will retry');
      throw new Error('Recovery link generation failed');
    }

    // Store link in DB with 7-day expiration — idempotency guard prevents duplicate
    // rows if BullMQ retries this job after email send fails.
    const existingLink = await prisma.recoveryLink.findFirst({
      where: { failedPaymentId },
      orderBy: { createdAt: 'desc' },
    });
    if (existingLink) {
      link = existingLink.url; // reuse existing link so email sends the correct URL
      logger.info({ failedPaymentId }, 'Reusing existing recovery link on job retry');
    } else {
      await prisma.recoveryLink.create({
        data: {
          failedPaymentId,
          url: link,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });
    }

    // 4. Send Email (Initial or Reminder)
    await EmailService.sendRecoveryEmail(payment, link, payment.retryCount);

    // 5. Schedule Next Retry or Abandon
    if (payment.retryCount < 2) {
      const nextDelay = RETRY_DELAYS_MS[payment.retryCount] as number;
      if (nextDelay === undefined) throw new Error('Invalid retry delay configuration');

      await recoveryQueue.add(
        'process-payment',
        { failedPaymentId },
        { delay: nextDelay }
      );
      
      // Update state for next cycle
      await prisma.failedPayment.update({
        where: { id: failedPaymentId },
        data: {
          retryCount: { increment: 1 },
          lastRetryAt: new Date(),
          nextRetryAt: new Date(Date.now() + nextDelay),
          lockedAt: null
        }
      });
      logger.info({ failedPaymentId, retryCount: payment.retryCount + 1 }, 'Scheduled next reminder');
    } else {
      // Final attempt reached
      await prisma.failedPayment.update({
        where: { id: failedPaymentId },
        data: { status: 'abandoned', lockedAt: null }
      });
      logger.info({ failedPaymentId }, 'Max retries reached — abandoned');
    }

  } catch (err) {
    logger.error({ failedPaymentId, err }, 'Failed to process recovery job');
    // Release lock on error so BullMQ retry (or next pass) can pick it up
    await prisma.failedPayment.update({
      where: { id: failedPaymentId },
      data: { lockedAt: null }
    });
    throw err; // ensure BullMQ knows the job failed
  }
}

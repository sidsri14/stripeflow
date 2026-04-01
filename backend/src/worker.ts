import 'dotenv/config';
import pino from 'pino';
import { prisma } from './utils/prisma.js';
import { PaymentService } from './services/payment.service.js';
import { RazorpayService } from './services/razorpay.service.js';
import { SourceService } from './services/source.service.js';
import { sendPaymentFailedEmail, sendPaymentReminderEmail } from './services/email.service.js';
import { AuditService } from './services/audit.service.js';

const RECOVERY_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const ABANDON_AFTER_DAYS = 7;

const logger = pino({
  transport: { target: 'pino-pretty', options: { colorize: true } },
});

let isShuttingDown = false;
let recoveryHandle: ReturnType<typeof setTimeout> | null = null;

const processRecoveryQueue = async (): Promise<void> => {
  if (isShuttingDown) return;

  logger.info('Recovery worker tick started');

  try {
    // 1. Mark payments as abandoned when they have exhausted all retries or are too old.
    //    Exclude payments currently held by an advisory lock (being processed right now)
    //    to avoid abandoning a payment mid-flight.
    const abandonThreshold = new Date(Date.now() - ABANDON_AFTER_DAYS * 24 * 60 * 60 * 1000);
    const lockExpiry = new Date(Date.now() - 30 * 60 * 1000);
    const toAbandon = await prisma.failedPayment.findMany({
      where: {
        status: { in: ['pending', 'retrying'] },
        AND: [
          // Only abandon if not currently locked (or lock is stale > 30 min)
          { OR: [{ lockedAt: null }, { lockedAt: { lt: lockExpiry } }] },
          // Only abandon if exhausted retries OR too old
          { OR: [{ retryCount: { gte: 3 } }, { createdAt: { lt: abandonThreshold } }] },
        ],
      } as any,
      select: { id: true, paymentId: true },
    });
    for (const p of toAbandon) {
      await PaymentService.markAbandoned(p.id);
      logger.info({ paymentId: p.paymentId }, 'Payment abandoned');
    }
    if (toAbandon.length > 0) {
      logger.info(`Marked ${toAbandon.length} payment(s) as abandoned`);
    }

    // 2. Process retry queue (pending + retrying with retryCount < 3)
    const pending = await PaymentService.getPendingForRetry();
    logger.info(`${pending.length} payment(s) ready for retry`);

    for (const payment of pending) {
      try {
        // Race condition guard: re-check status before processing.
        // The payment could have been recovered by a webhook between our query and now.
        const fresh = await prisma.failedPayment.findUnique({
          where: { id: payment.id },
          select: { status: true },
        });
        if (!fresh || !['pending', 'retrying'].includes(fresh.status)) {
          logger.info({ paymentId: payment.paymentId }, 'Payment already processed, skipping');
          continue;
        }

        // Get source credentials (decrypted) for this payment
        let keyId = process.env.RAZORPAY_KEY_ID!;
        let keySecret = process.env.RAZORPAY_KEY_SECRET!;

        if (payment.eventId) {
          const event = await prisma.paymentEvent.findUnique({
            where: { id: payment.eventId },
            select: { sourceId: true },
          });
          if (event?.sourceId) {
            const source = await SourceService.getSourceWithSecrets(event.sourceId);
            if (source) {
              keyId = source.keyId;
              keySecret = source.keySecret; // already decrypted by getSourceWithSecrets
            }
          }
        }

        // Use existing recovery link if available, otherwise create one.
        // Cast: recoveryLinks is included via getPendingForRetry() but stale Prisma DLL
        // doesn't reflect it in types. tsc --noEmit is clean; remove cast after server restart.
        const links = (payment as typeof payment & { recoveryLinks: Array<{ url: string }> }).recoveryLinks;
        let paymentLink: string | undefined = links[0]?.url;
        if (!paymentLink) {
          paymentLink = await RazorpayService.createPaymentLink(keyId, keySecret, {
            amount: payment.amount,
            currency: payment.currency,
            customerName: payment.customerName ?? undefined,
            customerEmail: payment.customerEmail,
            customerPhone: payment.customerPhone ?? undefined,
            description: `Retry payment${payment.orderId ? ` for order ${payment.orderId}` : ''}`,
            referenceId: payment.id,
          });
          await PaymentService.createRecoveryLink(payment.id, paymentLink);
        }

        // Guard: if link creation failed above this line, the outer catch handles it.
        // This explicit check prevents passing undefined to the email service.
        if (!paymentLink) {
          throw new Error(`No payment link available for payment ${payment.id}`);
        }

        const dayOffset = payment.retryCount === 0 ? 0 : payment.retryCount === 1 ? 1 : 3;

        // 3. AWAIT: email must be sent BEFORE we update counts to ensure reliability
        if (payment.retryCount === 0) {
          await sendPaymentFailedEmail(payment.customerEmail, {
            customerName: payment.customerName ?? undefined,
            amount: payment.amount,
            currency: payment.currency,
            paymentLink,
            paymentId: payment.paymentId,
          });
        } else {
          await sendPaymentReminderEmail(payment.customerEmail, {
            customerName: payment.customerName ?? undefined,
            amount: payment.amount,
            currency: payment.currency,
            paymentLink,
            dayOffset,
            paymentId: payment.paymentId,
          });
        }

        // Single atomic transaction: log reminder, increment retryCount, set nextRetryAt,
        // release advisory lock. Returns the new retryCount for accurate logging.
        const newRetryCount = await PaymentService.recordReminderAndIncrementRetry(payment.id, dayOffset, 'email');

        await AuditService.log(
          payment.userId,
          'PAYMENT_REMINDER_SENT',
          'FailedPayment',
          payment.id,
          { retryCount: newRetryCount, dayOffset, email: payment.customerEmail }
        );

        logger.info({ paymentId: payment.paymentId, retryCount: newRetryCount }, 'Reminder sent');
      } catch (err) {
        logger.error({ paymentId: payment.paymentId, err }, 'Failed to process payment retry');
        // Release lock on error so another worker can try later
        await PaymentService.releaseLock(payment.id).catch(() => {});
      }
    }
  } catch (error) {
    logger.error(error, 'Recovery queue processing error');
  } finally {
    if (!isShuttingDown) {
      recoveryHandle = setTimeout(processRecoveryQueue, RECOVERY_INTERVAL_MS);
    }
  }
};

const shutdown = async (signal: string): Promise<void> => {
  logger.info(`Shutting down worker (${signal})`);
  isShuttingDown = true;
  if (recoveryHandle) clearTimeout(recoveryHandle);
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

logger.info('RecoverPay Worker v2.0 — started');
processRecoveryQueue();

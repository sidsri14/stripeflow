import { EmailService } from './EmailService.js';
import { SmsService } from './SmsService.js';
import pino from 'pino';

const logger = pino({ transport: { target: 'pino-pretty', options: { colorize: true } } });

/**
 * Unified Dispatcher for all recovery communications.
 * Handles channel selection logic based on retry stage.
 */
export class NotificationService {
  /**
   * Dispatches recovery messages across multiple channels.
   * Logic:
   * - Attempt 0 (Immediate): Email Only
   * - Attempt 1 (24h): Email Only
   * - Attempt 2 (72h): Email + SMS (for Pro users)
   */
  static async dispatchRecovery(payment: any, trackingUrl: string): Promise<void> {
    const { retryCount, customerEmail, customerPhone, user } = payment;
    
    // Always dispatch Email
    await EmailService.sendRecoveryEmail(payment, trackingUrl, retryCount);
    logger.info({ paymentId: payment.id, retryCount, channel: 'email' }, 'Dispatched Email Recovery');

    // Dispatch SMS/WhatsApp for Pro users on later attempts or if phone exists
    if (user?.plan === 'pro' && customerPhone) {
      // We'll add SMS on the 3rd attempt (retryCount === 2) to increase pressure/utility
      if (retryCount >= 2) {
        await SmsService.sendRecoverySms(
          customerPhone,
          payment.customerName || 'there',
          payment.amount,
          payment.currency || 'INR',
          trackingUrl
        );
        logger.info({ paymentId: payment.id, retryCount, channel: 'sms' }, 'Dispatched SMS Recovery');
      }
    }
  }
}

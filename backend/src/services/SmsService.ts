import pino from 'pino';

const logger = pino({ transport: { target: 'pino-pretty', options: { colorize: true } } });

/**
 * Service for sending recovery SMS/WhatsApp messages.
 * Part of Phase 6: Omnichannel Recovery.
 */
export class SmsService {
  /**
   * Dispatches a recovery SMS to the customer.
   * In production, this would use Twilio or a similar provider.
   */
  static async sendRecoverySms(
    phoneNumber: string, 
    customerName: string, 
    amount: number, 
    currency: string, 
    link: string
  ): Promise<void> {
    const formattedAmount = (amount / 100).toFixed(2);
    const message = `Hi ${customerName}, your payment of ${currency} ${formattedAmount} for your order failed. You can complete it here: ${link}`;

    // ── Twilio Integration Placeholder ───────────────────────────────────────
    // if (process.env.TWILIO_SID && process.env.TWILIO_AUTH_TOKEN) {
    //   // Logic to send via Twilio
    // }
    
    logger.info({ phoneNumber, message }, 'SMS Recovery Dispatched (Logged)');
  }

  /**
   * Dispatches a recovery WhatsApp message.
   */
  static async sendRecoveryWhatsApp(
    phoneNumber: string,
    customerName: string,
    amount: number,
    currency: string,
    link: string
  ): Promise<void> {
    const formattedAmount = (amount / 100).toFixed(2);
    const message = `*Payment Failed*\nHi ${customerName}, your payment of ${currency} ${formattedAmount} failed. Complete your order here: ${link}`;

    logger.info({ phoneNumber, message }, 'WhatsApp Recovery Dispatched (Logged)');
  }
}

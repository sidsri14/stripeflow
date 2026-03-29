import crypto from 'crypto';
import Razorpay from 'razorpay';

export class RazorpayService {
  static verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
    const expected = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');
    try {
      const expectedBuf = Buffer.from(expected, 'hex');
      const receivedBuf = Buffer.from(signature, 'hex');
      if (expectedBuf.length !== receivedBuf.length) return false;
      return crypto.timingSafeEqual(expectedBuf, receivedBuf);
    } catch {
      return false;
    }
  }

  static async createPaymentLink(
    keyId: string,
    keySecret: string,
    params: {
      amount: number;
      currency: string;
      customerName?: string;
      customerEmail: string;
      customerPhone?: string;
      description: string;
      referenceId: string;
    }
  ): Promise<string> {
    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const response = await razorpay.paymentLink.create({
      amount: params.amount,
      currency: params.currency,
      accept_partial: false,
      description: params.description,
      customer: {
        name: params.customerName || '',
        email: params.customerEmail,
        contact: params.customerPhone || '',
      },
      notify: { sms: false, email: false },
      reference_id: params.referenceId,
      ...(process.env.FRONTEND_URL && {
        callback_url: `${process.env.FRONTEND_URL}/payment-success`,
        callback_method: 'get',
      }),
    } as any);
    return (response as any).short_url as string;
  }
}

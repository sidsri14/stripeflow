import Razorpay from 'razorpay';

export const getRazorpayInstance = (keyId: string, keySecret: string) => 
  new Razorpay({ key_id: keyId, key_secret: keySecret });

/** Generates a hosted payment link via Razorpay. */
export const getPaymentLink = async (keyId: string, keySecret: string, data: any) => {
  try {
    const rzp = getRazorpayInstance(keyId, keySecret);
    const link = await rzp.paymentLink.create({
      amount: data.amount, // already in paise — do NOT multiply by 100
      currency: data.currency || 'INR',
      accept_partial: false,
      description: data.description || `Recovery for ${data.referenceId}`,
      customer: { name: data.customerName, email: data.customerEmail, contact: data.customerPhone },
      notify: { sms: false, email: false }, // we send our own emails
      reminder_enable: false,
      notes: { internal_id: data.referenceId },
      callback_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment-status`,
      callback_method: 'get'
    });
    return link.short_url;
  } catch (err) {
    console.error('[Razorpay Link Failure]', err);
    return null;
  }
};

export const verifyRazorpayWebhook = (body: string, sig: string, secret: string) =>
  Razorpay.validateWebhookSignature(body, sig, secret);

export const validateRazorpayCredentials = async (keyId: string, keySecret: string) => {
  try {
    const rzp = getRazorpayInstance(keyId, keySecret);
    await rzp.payments.all({ count: 1 });
    return true;
  } catch {
    return false;
  }
};

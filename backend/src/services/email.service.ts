import { sendEmail } from './resend.service.js';
import type { Invoice, Client, User, InvoiceItem } from '@prisma/client';

const APP_NAME = 'StripeFlow';

// ── Auth emails (called by auth.service.ts) ───────────────────────────────────

export async function sendEmailVerificationEmail(
  email: string,
  { verifyLink }: { verifyLink: string }
): Promise<void> {
  await sendEmail({
    to: email,
    subject: `Verify your ${APP_NAME} account`,
    html: `
      <h2>Welcome to ${APP_NAME}!</h2>
      <p>Click the link below to verify your email address. This link expires in 24 hours.</p>
      <p><a href="${verifyLink}" style="background:#000;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;">Verify Email</a></p>
      <p>Or copy: ${verifyLink}</p>
    `,
  });
}

export async function sendPasswordResetEmail(
  email: string,
  { resetLink, expiresInMinutes }: { resetLink: string; expiresInMinutes: number }
): Promise<void> {
  await sendEmail({
    to: email,
    subject: `Reset your ${APP_NAME} password`,
    html: `
      <h2>Password Reset</h2>
      <p>Click below to set a new password. This link expires in ${expiresInMinutes} minutes.</p>
      <p><a href="${resetLink}" style="background:#000;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;">Reset Password</a></p>
      <p>If you didn't request this, ignore this email.</p>
    `,
  });
}

// ── Invoice emails ────────────────────────────────────────────────────────────

type InvoiceWithClient = Invoice & { client: Client; user: User; items: InvoiceItem[] };

export async function sendInvoiceEmail(
  invoice: InvoiceWithClient,
  paymentUrl: string,
  pdfBuffer: Buffer
): Promise<void> {
  await sendEmail({
    to: invoice.client.email,
    subject: `Invoice ${invoice.number} from ${invoice.user.name ?? APP_NAME} — $${(invoice.amountCents / 100).toFixed(2)}`,
    html: `
      <h2>Invoice ${invoice.number}</h2>
      <p>Hi ${invoice.client.name},</p>
      <p>Please find your invoice for <strong>$${(invoice.amountCents / 100).toFixed(2)} ${invoice.currency}</strong>, due on ${new Date(invoice.dueDate).toDateString()}.</p>
      <p>
        <a href="${paymentUrl}" style="background:#000;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Pay Now</a>
      </p>
      <p>The invoice PDF is attached.</p>
    `,
    attachments: [{ filename: `${invoice.number}.pdf`, content: pdfBuffer }],
  });
}

export async function sendReminderEmail(invoice: InvoiceWithClient): Promise<void> {
  const isOverdue = new Date() > new Date(invoice.dueDate);
  await sendEmail({
    to: invoice.client.email,
    subject: isOverdue
      ? `Overdue: Invoice ${invoice.number} — payment required`
      : `Reminder: Invoice ${invoice.number} is due soon`,
    html: `
      <h2>${isOverdue ? 'Overdue Invoice' : 'Payment Reminder'}</h2>
      <p>Hi ${invoice.client.name},</p>
      <p>Invoice ${invoice.number} for <strong>$${(invoice.amountCents / 100).toFixed(2)}</strong> is ${isOverdue ? 'past due' : 'due on ' + new Date(invoice.dueDate).toDateString()}.</p>
      <p>Please complete your payment at your earliest convenience. Contact ${invoice.user.name ?? APP_NAME} if you have questions.</p>
    `,
  });
}

export async function sendReceiptEmail(invoice: InvoiceWithClient): Promise<void> {
  await sendEmail({
    to: invoice.client.email,
    subject: `Payment received — Invoice ${invoice.number}`,
    html: `
      <h2>Payment Confirmed</h2>
      <p>Hi ${invoice.client.name},</p>
      <p>Thank you! We've received your payment of <strong>$${(invoice.amountCents / 100).toFixed(2)}</strong> for Invoice ${invoice.number}.</p>
      <p>This email serves as your receipt. Paid on ${new Date().toDateString()}.</p>
    `,
  });
}

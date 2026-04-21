import crypto from 'crypto';
import { prisma } from '../utils/prisma.js';
import { sendInvoiceEmail } from '../lib/resend.js';
import { StripeBillingService } from './StripeBillingService.js';
import { enqueueInvoiceReminder } from '../jobs/invoice.queue.js';

export class InvoiceService {
  /**
   * Complete flow to create an invoice.
   */
  static async createInvoice(userId: string, data: {
    clientId?: string;
    clientEmail: string;
    description: string;
    amount: number;
    dueDate: Date;
    currency?: string;
  }) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    // 1. Resolve or create client
    let client = null;
    if (data.clientId) {
      client = await prisma.client.findFirst({ where: { id: data.clientId, userId } });
    }
    if (!client) {
      // Upsert an implicit client record keyed by (userId, email) so FK is always satisfied
      client = await prisma.client.upsert({
        where: { userId_email: { userId, email: data.clientEmail } },
        create: { userId, name: data.clientEmail, email: data.clientEmail },
        update: {},
      });
    }

    // 2. Create database record
    const invoice = await prisma.invoice.create({
      data: {
        userId,
        clientId: client.id,
        number: `INV-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
        clientEmail: data.clientEmail,
        description: data.description,
        amount: data.amount,
        dueDate: data.dueDate,
        currency: data.currency || 'USD',
        status: 'SENT'
      }
    });

    // 3. PDF served on-demand at /api/invoices/:id/pdf (no upload step yet)
    const pdfUrl = `${process.env.BACKEND_URL ?? 'http://localhost:3000'}/api/invoices/${invoice.id}/pdf`;

    // 4. Create Stripe Payment Link/Session
    const stripeSession = await StripeBillingService.createInvoiceSession(invoice, user);

    // 5. Update invoice with metadata
    const checkoutUrl = stripeSession.checkoutUrl ?? null;
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        pdfUrl,
        stripeSessionId: stripeSession.id,
        stripeCheckoutUrl: checkoutUrl,
      }
    });

    // 6. Send Email via Resend
    const brandData = user.brandSettings ? JSON.parse(user.brandSettings) : {};
    await sendInvoiceEmail(data.clientEmail, pdfUrl, checkoutUrl ?? pdfUrl, {
      ...invoice,
      dueDate: data.dueDate
    }, {
      accentColor: brandData.accentColor,
      companyName: brandData.companyName,
      emailTone: user.brandEmailTone || 'professional'
    });

    // 7. Schedule BullMQ reminders
    await enqueueInvoiceReminder(invoice.id, 'reminder1', 3 * 24 * 60 * 60 * 1000);
    await enqueueInvoiceReminder(invoice.id, 'reminder2', 7 * 24 * 60 * 60 * 1000);

    const updatedInvoice = await prisma.invoice.findUnique({ where: { id: invoice.id } });

    return {
      success: true,
      ...updatedInvoice,
      paymentUrl: stripeSession.checkoutUrl
    };
  }
}

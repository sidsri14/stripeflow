import { Resend } from 'resend';

let client: Resend | null = null;

function getClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{ filename: string; content: Buffer }>;
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  const resend = getClient();
  if (!resend) {
    console.log('\n══════════════════════════════════════════════════');
    console.log('[DEV EMAIL — no RESEND_API_KEY — not sent]');
    console.log(`To: ${params.to} | Subject: ${params.subject}`);
    console.log('══════════════════════════════════════════════════\n');
    return;
  }

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM ?? 'StripeFlow <noreply@stripeflow.app>',
    to: params.to,
    subject: params.subject,
    html: params.html,
    attachments: params.attachments?.map((a) => ({
      filename: a.filename,
      content: a.content,
    })),
  });

  if (error) throw new Error(`Resend error: ${error.message}`);
}

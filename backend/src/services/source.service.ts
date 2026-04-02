import { prisma } from '../utils/prisma.js';
import { encrypt, decrypt } from '../utils/crypto.utils.js';
import { validateRazorpayCredentials } from './razorpay.service.js';

export const getWebhookUrl = (sourceId: string) => {
  const base = (process.env.WEBHOOK_BASE_URL || process.env.BACKEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  return `${base}/api/webhooks/razorpay/${sourceId}`;
};

export const createPaymentSource = (userId: string, data: any) =>
  prisma.paymentSource.create({
    data: {
      userId, keyId: data.keyId,
      keySecret: encrypt(data.keySecret),
      webhookSecret: encrypt(data.webhookSecret),
      name: data.name
    },
    select: { id: true, userId: true, provider: true, name: true, keyId: true, createdAt: true },
  });

export const getPaymentSources = async (userId: string) => {
  const srcs = await prisma.paymentSource.findMany({
    where: { userId },
    select: { id: true, userId: true, provider: true, name: true, keyId: true, createdAt: true, _count: { select: { events: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return srcs.map(s => ({ ...s, webhookUrl: getWebhookUrl(s.id) }));
};

export const deletePaymentSource = async (userId: string, id: string) => {
  const s = await prisma.paymentSource.findFirst({ where: { id, userId } });
  if (!s) throw { status: 404, message: 'Source not found' };
  await prisma.paymentSource.delete({ where: { id } });
};

export const getSourceWithSecrets = async (id: string) => {
  const s = await prisma.paymentSource.findUnique({ where: { id } });
  return s ? { ...s, keySecret: decrypt(s.keySecret), webhookSecret: decrypt(s.webhookSecret) } : null;
};

// Validates the provided keyId + keySecret against Razorpay by calling payments.all.
// Uses the caller-supplied credentials, not the global env var keys.
export const validateSourceCredentials = (keyId: string, keySecret: string) =>
  validateRazorpayCredentials(keyId, keySecret);

import type { Job } from 'bullmq';
import crypto from 'crypto';
import pino from 'pino';
import { prisma } from '../utils/prisma.js';

const logger = pino({ transport: { target: 'pino-pretty', options: { colorize: true } } });

const DISPATCH_TIMEOUT_MS = 10_000;

export async function processWebhookDeliveryJob(job: Job): Promise<void> {
  const { endpointId, url, secret, event, body } = job.data as {
    endpointId: string;
    url: string;
    secret: string;
    event: string;
    body: string;
  };

  const attempt = (job.attemptsMade ?? 0) + 1;
  const sig = `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DISPATCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-payrecover-signature': sig,
        'x-payrecover-event': event,
      },
      body,
      signal: controller.signal,
    });

    if (!res.ok) {
      await prisma.webhookDelivery.create({
        data: { endpointId, event, status: 'failed', responseCode: res.status, attempt },
      }).catch(() => {});
      logger.warn({ endpointId, url, status: res.status, event }, '[Webhook] Non-2xx — BullMQ will retry');
      throw new Error(`Non-2xx response: ${res.status}`);
    }

    await prisma.webhookDelivery.create({
      data: { endpointId, event, status: 'success', responseCode: res.status, attempt },
    }).catch(() => {});
    logger.info({ endpointId, url, status: res.status, event }, '[Webhook] Delivered');
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      await prisma.webhookDelivery.create({
        data: { endpointId, event, status: 'timeout', attempt },
      }).catch(() => {});
    }
    const reason = err?.name === 'AbortError' ? 'timeout' : err?.message;
    logger.error({ endpointId, url, event, reason }, '[Webhook] Delivery failed — will retry');
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

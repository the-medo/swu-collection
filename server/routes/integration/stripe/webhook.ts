import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import type { AuthExtension } from '../../../auth/auth.ts';
import { stripeClient, logSupportFailure } from '../../../lib/stripe/config.ts';
import { supportService } from '../../../lib/stripe/service.ts';

export function createStripeWebhookRoute(
  service = supportService,
  getClient = stripeClient,
  getSecret = () => process.env.STRIPE_WEBHOOK_SECRET,
) {
  return new Hono<AuthExtension>().post(
    '/',
    bodyLimit({
      maxSize: 256 * 1024,
      onError: c => c.json({ message: 'Request too large.' }, 413),
    }),
    async c => {
      const secret = getSecret();
      if (!secret || !secret.startsWith('whsec_'))
        return c.json({ message: 'Webhook is not configured.' }, 503);
      const signature = c.req.header('Stripe-Signature');
      if (!signature) return c.json({ message: 'Invalid webhook signature.' }, 400);
      let client;
      try {
        client = getClient();
      } catch {
        return c.json({ message: 'Webhook is not configured.' }, 503);
      }
      let event;
      try {
        event = await client.webhooks.constructEventAsync(await c.req.text(), signature, secret);
      } catch {
        return c.json({ message: 'Invalid webhook signature.' }, 400);
      }
      try {
        await service.webhook(event);
        return c.json({ received: true });
      } catch (error) {
        logSupportFailure(error);
        return c.json({ message: 'Webhook processing is temporarily unavailable.' }, 503);
      }
    },
  );
}
export const stripeWebhookRoute = createStripeWebhookRoute();

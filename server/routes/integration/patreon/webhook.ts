import { createHmac, timingSafeEqual } from 'node:crypto';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';
import type { AuthExtension } from '../../../auth/auth.ts';
import { PatreonError } from '../../../lib/patreon/config.ts';
import { patreonService } from '../../../lib/patreon/service.ts';
import { logPatreonFailure } from '../../../lib/patreon/log.ts';

const eventSchema = z.enum([
  'members:create',
  'members:update',
  'members:delete',
  'members:pledge:create',
  'members:pledge:update',
  'members:pledge:delete',
]);
const id = z.string().min(1).max(200);
const payloadSchema = z.object({
  data: z.object({
    id,
    type: z.literal('member'),
    relationships: z.object({
      campaign: z.object({ data: z.object({ id, type: z.literal('campaign') }) }),
    }),
  }),
});

export function validPatreonSignature(
  body: Uint8Array,
  signature: string | undefined,
  secret: string,
) {
  if (!signature || !/^[a-f\d]{32}$/i.test(signature)) return false;
  const expected = createHmac('md5', secret).update(body).digest();
  return timingSafeEqual(expected, Buffer.from(signature, 'hex'));
}

export function createPatreonWebhookRoute(
  handle = patreonService.webhook,
  secret = () => process.env.PATREON_WEBHOOK_SECRET,
) {
  return new Hono<AuthExtension>().post(
    '/',
    bodyLimit({
      maxSize: 256_000,
      onError: c => c.json({ message: 'Webhook is too large.' }, 413),
    }),
    async c => {
      const key = secret();
      if (!key) return c.json({ message: 'Patreon webhook is not configured.' }, 503);
      const bytes = new Uint8Array(await c.req.arrayBuffer());
      if (!validPatreonSignature(bytes, c.req.header('X-Patreon-Signature'), key))
        return c.json({ message: 'Invalid Patreon signature.' }, 401);
      if (!eventSchema.safeParse(c.req.header('X-Patreon-Event')).success)
        return c.json({ message: 'Unsupported Patreon event.' }, 400);
      // Validation follows raw-byte authentication, so JSON serialization can
      // never change the signed message or an unverified body trigger work.
      let body: unknown;
      try {
        body = JSON.parse(new TextDecoder().decode(bytes));
      } catch {
        return c.json({ message: 'Invalid webhook JSON.' }, 400);
      }
      const payload = payloadSchema.safeParse(body);
      if (!payload.success) return c.json({ message: 'Invalid Patreon webhook.' }, 400);
      try {
        await handle(payload.data.data.relationships.campaign.data.id, payload.data.data.id);
        // Acknowledge only after the credit/checkpoint transaction commits.
        return c.json({ received: true });
      } catch (error) {
        logPatreonFailure('webhook', error);
        if (error instanceof PatreonError) return c.json({ message: error.message }, error.status);
        // Provider retry is intentional. Do not leak/log bodies, emails or SQL.
        return c.json({ message: 'Patreon webhook processing failed. Please retry.' }, 503);
      }
    },
  );
}

export const patreonWebhookRoute = createPatreonWebhookRoute();

import { expect, test } from 'bun:test';
import { createHmac } from 'node:crypto';
import { createPatreonWebhookRoute } from '../../routes/integration/patreon/webhook.ts';
import { memberSnapshot } from './model.ts';
import { tokenCodec } from './client.ts';

const secret = 'fixture-webhook-secret';
const payload = JSON.stringify({
  data: {
    id: 'member',
    type: 'member',
    attributes: { campaign_lifetime_support_cents: 999999999 },
    relationships: { campaign: { data: { id: 'campaign', type: 'campaign' } } },
  },
});
const signature = (body: string) => createHmac('md5', secret).update(body).digest('hex');

test('webhook verifies raw bytes and only passes campaign/member identity to reconciliation', async () => {
  const calls: string[][] = [];
  const route = createPatreonWebhookRoute(
    async (campaign, member) => {
      calls.push([campaign, member]);
    },
    () => secret,
  );
  const send = (body = payload, sig = signature(body), event = 'members:update') =>
    route.request('/', {
      method: 'POST',
      body,
      headers: { 'X-Patreon-Signature': sig, 'X-Patreon-Event': event },
    });
  expect((await send(payload, '')).status).toBe(401);
  expect((await send(payload, 'x'.repeat(32))).status).toBe(401);
  expect((await send(payload, '0'.repeat(32))).status).toBe(401);
  expect((await send(payload + ' ', signature(payload))).status).toBe(401);
  expect((await send('{')).status).toBe(400);
  expect((await send('{}')).status).toBe(400);
  expect((await send(payload, signature(payload), 'posts:update')).status).toBe(400);
  expect(calls).toEqual([]);
  expect((await send()).status).toBe(200);
  expect((await send(payload, signature(payload), 'members:pledge:delete')).status).toBe(200);
  expect(calls).toEqual([
    ['campaign', 'member'],
    ['campaign', 'member'],
  ]);
  const oversized = 'x'.repeat(256001);
  expect((await send(oversized)).status).toBe(413);
});

test('unconfigured webhook fails closed and failed processing remains retryable', async () => {
  const request = {
    method: 'POST',
    body: payload,
    headers: { 'X-Patreon-Signature': signature(payload), 'X-Patreon-Event': 'members:update' },
  };
  const disabled = createPatreonWebhookRoute(
    async () => {
      throw new Error('must not run');
    },
    () => undefined,
  );
  expect((await disabled.request('/', request)).status).toBe(503);
  const failure = createPatreonWebhookRoute(
    async () => {
      throw new Error('private database parameters');
    },
    () => secret,
  );
  const response = await failure.request('/', request);
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain('private database');
});

test('provider amount validation and authenticated token encryption reject tampering', () => {
  const member = JSON.parse(payload).data;
  member.attributes.campaign_lifetime_support_cents = -1;
  expect(() => memberSnapshot(member, 'campaign', new Date())).toThrow('invalid member');
  member.attributes.campaign_lifetime_support_cents = null;
  expect(memberSnapshot(member, 'campaign', new Date()).lifetimeCents).toBeNull();
  expect(() => memberSnapshot(member, 'other', new Date())).toThrow('invalid member');
  const codec = tokenCodec('fixture-encryption-key-with-at-least-32-characters');
  const sealed = codec.encrypt('fixture-token');
  expect(codec.decrypt(sealed)).toBe('fixture-token');
  const bytes = Buffer.from(sealed, 'base64');
  bytes[15] ^= 1;
  expect(() => codec.decrypt(bytes.toString('base64'))).toThrow('could not be decrypted');
});

import { expect, test } from 'bun:test';
import { Hono } from 'hono';
import type { AuthExtension } from '../auth/auth.ts';
import { CreditsError, creditsService } from '../lib/credits/service.ts';
import { createShopRoute } from './shop.ts';

function fixture(actor: string | null = 'buyer', failure?: CreditsError) {
  const calls: unknown[][] = [];
  const wallet = { credits: 10000, beskarCents: 500, achievementLimit: 1, battlefieldLimit: 1 };
  const app = new Hono<AuthExtension>()
    .use('*', async (c, next) => {
      c.set(
        'user',
        actor ? ({ id: actor } as NonNullable<AuthExtension['Variables']['user']>) : null,
      );
      await next();
    })
    .route(
      '/shop',
      createShopRoute({
        ...creditsService,
        wallet: async (...args) => {
          calls.push(args);
          return wallet;
        },
        purchase: async (...args) => {
          calls.push(args);
          if (failure) throw failure;
          return {
            wallet,
            applied: true,
            transactionId: crypto.randomUUID(),
            itemId: args[1].itemId,
          };
        },
      }),
    );
  const buy = (body: unknown, header = true) =>
    app.request('/shop/purchases', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': String(Buffer.byteLength(JSON.stringify(body))),
        ...(header ? { 'X-Requested-With': 'swubase' } : {}),
      },
      body: JSON.stringify(body),
    });
  return { app, buy, calls };
}

test('the shop denies anonymous purchases and derives the buyer from the session', async () => {
  const anonymous = fixture(null);
  expect((await anonymous.app.request('/shop')).status).toBe(401);
  expect(
    (await anonymous.buy({ itemId: 'achievement-slot', requestId: crypto.randomUUID() })).status,
  ).toBe(401);
  expect(anonymous.calls).toHaveLength(0);
  const f = fixture();
  const catalog = await f.app.request('/shop');
  expect(catalog.headers.get('Cache-Control')).toBe('private, no-store');
  const data = (await catalog.json()).data;
  expect(data.items.map((item: { priceCents: number }) => item.priceCents)).toEqual([500, 300]);
  const input = { itemId: 'battlefield-slot', requestId: crypto.randomUUID() };
  expect((await f.buy(input)).status).toBe(200);
  expect(f.calls).toEqual([['buyer'], ['buyer', input]]);
  for (const body of [
    { ...input, itemId: 'unknown' },
    { ...input, price: 0 },
    { ...input, amount: 0 },
    { ...input, userId: 'another' },
    { ...input, requestId: 'invalid' },
  ])
    expect((await f.buy(body)).status).toBe(400);
  expect((await f.buy(input, false)).status).toBe(403);
  expect((await f.buy({ note: 'a'.repeat(1500) })).status).toBe(413);
  expect(f.calls).toHaveLength(2);
});

test('expected shop business conflicts return safe errors', async () => {
  for (const status of [400, 404, 409] as const) {
    const f = fixture('buyer', new CreditsError('Expected failure.', status));
    const response = await f.buy({ itemId: 'achievement-slot', requestId: crypto.randomUUID() });
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ message: 'Expected failure.' });
  }
});

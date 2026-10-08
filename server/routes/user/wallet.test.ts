import { expect, test } from 'bun:test';
import { Hono } from 'hono';
import type { AuthExtension } from '../../auth/auth.ts';
import { creditsService } from '../../lib/credits/service.ts';
import { createUserWalletRoute } from './wallet.ts';

function fixture(actor: string | null) {
  const calls: unknown[][] = [];
  const app = new Hono<AuthExtension>()
    .use('*', async (c, next) => {
      c.set(
        'user',
        actor
          ? ({ id: actor, role: 'admin' } as NonNullable<AuthExtension['Variables']['user']>)
          : null,
      );
      await next();
    })
    .route(
      '/',
      createUserWalletRoute({
        ...creditsService,
        wallet: async (...args) => {
          calls.push(args);
          return { credits: 10000, beskarCents: 250, achievementLimit: 1, battlefieldLimit: 1 };
        },
        transactions: async (...args) => {
          calls.push(args);
          return { transactions: [], page: args[1], pageSize: 25, total: 0 };
        },
      }),
    )
    .get('/:id/public', c => c.json({ public: true }));
  return { app, calls };
}

test('wallet and transactions are owner-only, including when another user is an admin', async () => {
  for (const [actor, status] of [
    [null, 401],
    ['other-user', 403],
  ] as const) {
    const f = fixture(actor);
    for (const path of ['/owner/wallet', '/owner/transactions?page=1']) {
      const response = await f.app.request(path);
      expect(response.status).toBe(status);
      expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    }
    expect(f.calls).toHaveLength(0);
    // Mounting these routes must not privatize public profile endpoints.
    expect((await f.app.request('/owner/public')).status).toBe(200);
  }
});

test('the owner can read balances and paginated transactions with validated query input', async () => {
  const f = fixture('owner');
  const balance = await f.app.request('/owner/wallet');
  expect(balance.status).toBe(200);
  expect((await balance.json()).data).toMatchObject({ credits: 10000, beskarCents: 250 });
  expect((await f.app.request('/owner/transactions?page=2')).status).toBe(200);
  expect(f.calls).toEqual([['owner'], ['owner', 2]]);
  for (const query of [
    'page=0',
    'page=-1',
    'page=1.5',
    'page=100001',
    'page=garbage',
    'userId=other',
  ])
    expect((await f.app.request('/owner/transactions?' + query)).status).toBe(400);
  expect(f.calls).toHaveLength(2);
});

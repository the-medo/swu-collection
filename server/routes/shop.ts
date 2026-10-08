import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { zValidator } from '@hono/zod-validator';
import type { AuthExtension } from '../auth/auth.ts';
import { creditsService, CreditsError } from '../lib/credits/service.ts';
import { shopPurchaseInput, SHOP_ITEMS } from '../../shared/types/credits.ts';

export function createShopRoute(service = creditsService) {
  return new Hono<AuthExtension>()
    .onError((error, c) => {
      if (error instanceof CreditsError) return c.json({ message: error.message }, error.status);
      throw error;
    })
    .use('*', async (c, next) => {
      c.header('Cache-Control', 'private, no-store');
      if (!c.get('user')) return c.json({ message: 'Unauthorized' }, 401);
      if (c.req.method === 'POST' && c.req.header('X-Requested-With') !== 'swubase')
        return c.json({ message: 'Invalid request origin.' }, 403);
      await next();
    })
    .get('/', async c =>
      c.json({
        data: {
          items: SHOP_ITEMS,
          wallet: await service.wallet(c.get('user')!.id),
        },
      }),
    )
    .post(
      '/purchases',
      bodyLimit({ maxSize: 1024, onError: c => c.json({ message: 'Request too large.' }, 413) }),
      zValidator('json', shopPurchaseInput),
      async c => c.json({ data: await service.purchase(c.get('user')!.id, c.req.valid('json')) }),
    );
}

export const shopRoute = createShopRoute();

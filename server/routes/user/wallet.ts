import { Hono, type MiddlewareHandler } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthExtension } from '../../auth/auth.ts';
import { creditsService, CreditsError } from '../../lib/credits/service.ts';
import { transactionQuery } from '../../../shared/types/credits.ts';

const params = z.strictObject({ id: z.string().min(1).max(200) });
const ownerOnly: MiddlewareHandler<AuthExtension> = async (c, next) => {
  c.header('Cache-Control', 'private, no-store');
  const owner = c.get('user');
  if (!owner) return c.json({ message: 'Unauthorized' }, 401);
  if (owner.id !== c.req.param('id')) return c.json({ message: 'Forbidden' }, 403);
  await next();
};

export function createUserWalletRoute(service = creditsService) {
  return new Hono<AuthExtension>()
    .onError((error, c) => {
      if (error instanceof CreditsError) return c.json({ message: error.message }, error.status);
      throw error;
    })
    .use('/:id/wallet', ownerOnly)
    .use('/:id/transactions', ownerOnly)
    .get('/:id/wallet', zValidator('param', params), async c =>
      c.json({ data: await service.wallet(c.req.valid('param').id) }),
    )
    .get(
      '/:id/transactions',
      zValidator('param', params),
      zValidator('query', transactionQuery),
      async c =>
        c.json({
          data: await service.transactions(c.req.valid('param').id, c.req.valid('query').page),
        }),
    );
}

export const userWalletRoute = createUserWalletRoute();

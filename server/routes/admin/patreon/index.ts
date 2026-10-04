import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthExtension } from '../../../auth/auth.ts';
import { requireAdmin } from '../../../auth/requireAdmin.ts';
import { patreonListQuery } from '../../../../shared/types/patreon.ts';
import { PatreonError } from '../../../lib/patreon/config.ts';
import { patreonService } from '../../../lib/patreon/service.ts';
import { logPatreonFailure } from '../../../lib/patreon/log.ts';

export function createPatreonAdminRoute(service = patreonService, authorize = requireAdmin) {
  return new Hono<AuthExtension>()
    .onError((error, c) => {
      logPatreonFailure('admin', error);
      if (error instanceof PatreonError) return c.json({ message: error.message }, error.status);
      // Database errors can contain private member attributes in query params.
      return c.json({ message: 'Patreon operation failed. Please retry.' }, 500);
    })
    .use('*', async (c, next) => {
      c.header('Cache-Control', 'private, no-store');
      const admin = await authorize(c);
      if (admin.response) return admin.response;
      if (c.req.method === 'POST' && c.req.header('X-Requested-With') !== 'swubase')
        return c.json({ message: 'Invalid request origin.' }, 403);
      await next();
    })
    .get('/', zValidator('query', patreonListQuery), async c =>
      c.json({ data: await service.overview(c.req.valid('query').page) }),
    )
    .post('/sync', async c => c.json({ data: await service.sync() }))
    .post(
      '/:memberId/review',
      zValidator('param', z.object({ memberId: z.string().min(1).max(200) })),
      async c =>
        c.json({ data: await service.review(c.req.valid('param').memberId, c.get('user')!.id) }),
    );
}

export const patreonAdminRoute = createPatreonAdminRoute();

import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { zValidator } from '@hono/zod-validator';
import type { AuthExtension } from '../../../auth/auth.ts';
import { requireAdmin } from '../../../auth/requireAdmin.ts';
import { creditsService, CreditsError } from '../../../lib/credits/service.ts';
import {
  creditUsersQuery,
  creditUserParams,
  creditGrantInput,
} from '../../../../shared/types/credits.ts';

export function createCreditsAdminRoute(service = creditsService, authorize = requireAdmin) {
  return new Hono<AuthExtension>()
    .onError((error, c) => {
      if (error instanceof CreditsError) return c.json({ message: error.message }, error.status);
      throw error;
    })
    .use('*', async (c, next) => {
      c.header('Cache-Control', 'private, no-store');
      const admin = await authorize(c);
      if (admin.response) return admin.response;
      if (c.req.method === 'POST' && c.req.header('X-Requested-With') !== 'swubase')
        return c.json({ message: 'Invalid request origin.' }, 403);
      await next();
    })
    .use(
      '*',
      bodyLimit({ maxSize: 1024, onError: c => c.json({ message: 'Request too large.' }, 413) }),
    )
    .get('/', zValidator('query', creditUsersQuery), async c =>
      c.json({ data: await service.users(c.req.valid('query').search) }),
    )
    .post(
      '/:userId/grants',
      zValidator('param', creditUserParams),
      zValidator('json', creditGrantInput),
      async c =>
        c.json({
          data: await service.grant(
            c.req.valid('param').userId,
            c.get('user')!.id,
            c.req.valid('json'),
          ),
        }),
    );
}

export const creditsAdminRoute = createCreditsAdminRoute();

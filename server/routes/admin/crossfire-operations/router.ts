import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { AuthExtension } from '../../../auth/auth.ts';
import { requireAdmin } from '../../../auth/requireAdmin.ts';
import { crossfireOperationsQuery } from '../../../../shared/types/crossfire-operations.ts';
import type { CrossfireOperationsHours } from '../../../../shared/types/crossfire-operations.ts';
import type { CrossfireOperations } from '../../../lib/crossfire/operations.ts';

export function createCrossfireOperationsRouter(
  service: () => CrossfireOperations,
  authorize = requireAdmin,
) {
  return new Hono<AuthExtension>()
    .use('*', async (c, next) => {
      c.header('Cache-Control', 'no-store');
      const auth = await authorize(c);
      if (auth.response) return auth.response;
      await next();
    })
    .get('/', zValidator('query', crossfireOperationsQuery), async c => {
      const hours = c.req.valid('query').hours;
      return c.json({
        data: await service().status(
          hours === 'all' ? 'all' : (Number(hours) as Exclude<CrossfireOperationsHours, 'all'>),
        ),
      });
    });
}

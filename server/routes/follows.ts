import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { HTTPException } from 'hono/http-exception';
import type { AuthExtension } from '../auth/auth.ts';
import { followService } from '../lib/follows/service.ts';
import {
  followingQuerySchema,
  followKindSchema,
  followStatusQuerySchema,
  followTargetSchema,
} from '../../shared/types/follows.ts';

export function createFollowsRoute(service = followService) {
  return new Hono<AuthExtension>()
    .onError((error, c) => {
      if (error instanceof HTTPException) return c.json({ message: error.message }, error.status);
      throw error;
    })
    .use('*', async (c, next) => {
      c.header('Cache-Control', 'private, no-store');
      if (!['GET', 'HEAD'].includes(c.req.method)) {
        if (!c.get('user')) return c.json({ message: 'Sign in to follow.' }, 401);
        if (c.req.header('X-Requested-With') !== 'swubase')
          return c.json({ message: 'Invalid request origin.' }, 403);
      }
      await next();
    })
    .get('/', zValidator('query', followingQuerySchema), async c => {
      const viewer = c.get('user');
      if (!viewer) return c.json({ message: 'Sign in to see who you follow.' }, 401);
      const { kind, page } = c.req.valid('query');
      return c.json({ data: await service.list(kind, viewer.id, page) });
    })
    .get(
      '/:kind/status',
      zValidator('param', z.object({ kind: followKindSchema })),
      zValidator('query', followStatusQuerySchema),
      async c => {
        const { kind } = c.req.valid('param');
        const { ids } = c.req.valid('query');
        if (kind === 'creators' && !z.array(z.uuid()).safeParse(ids).success)
          return c.json({ message: 'Invalid creator IDs.' }, 400);
        return c.json({ data: await service.statuses(kind, ids, c.get('user')?.id) });
      },
    )
    .put('/:kind/:id', zValidator('param', followTargetSchema), async c => {
      const { kind, id } = c.req.valid('param');
      return c.json({ data: await service.set(kind, id, c.get('user')!.id, true) });
    })
    .delete('/:kind/:id', zValidator('param', followTargetSchema), async c => {
      const { kind, id } = c.req.valid('param');
      return c.json({ data: await service.set(kind, id, c.get('user')!.id, false) });
    });
}
export const followsRoute = createFollowsRoute();

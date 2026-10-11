import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthExtension } from '../../auth/auth.ts';
import { getAttachedDiscussion } from '../../lib/discussions/service.ts';

export const dailyPoolDiscussionRoute = new Hono<AuthExtension>().get(
  '/:id/discussion',
  async (c, next) => {
    c.header('Cache-Control', 'private, no-store');
    await next();
  },
  zValidator('param', z.object({ id: z.guid() })),
  async c => {
    const result = await getAttachedDiscussion(
      'daily-pool',
      c.req.valid('param').id,
      c.get('user')?.id,
    );
    if ('error' in result) return c.json({ error: result.error }, result.status);
    return c.json({ data: result.data });
  },
);

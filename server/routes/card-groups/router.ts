import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { CardGroupService } from '../../lib/card-groups/service.ts';
import { cardGroupFeedQuery } from '../../../types/CardGroup.ts';

export function createCardGroupsRouter(
  service: Pick<CardGroupService, 'list' | 'getPublished' | 'feed'>,
) {
  return (
    new Hono()
      .use('*', async (c, next) => {
        c.header('Cache-Control', 'no-store');
        await next();
      })
      // Keep the existing list contract for clients; the promo page uses the paginated feed.
      .get('/', async c => c.json({ data: await service.list(true) }))
      .get('/feed', zValidator('query', cardGroupFeedQuery), async c =>
        c.json(await service.feed(c.req.valid('query').cursor)),
      )
      .get('/:id', zValidator('param', z.object({ id: z.uuid() })), async c => {
        const row = await service.getPublished(c.req.valid('param').id);
        return row ? c.json({ data: row }) : c.json({ message: 'Card group not found.' }, 404);
      })
  );
}

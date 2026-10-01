import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthExtension } from '../../../auth/auth.ts';
import { requireAdmin } from '../../../auth/requireAdmin.ts';
import { eventHighlightInput } from '../../../../types/EventHighlight.ts';
import { eventHighlightService } from '../../../lib/tournaments/eventHighlights.ts';

const params = z.object({ id: z.uuid() });

export function createEventHighlightsRoute(
  service = eventHighlightService,
  authorize = requireAdmin,
) {
  return new Hono<AuthExtension>()
    .use('*', async (c, next) => {
      c.header('Cache-Control', 'no-store');
      const admin = await authorize(c);
      if (admin.response) return admin.response;
      await next();
    })
    .get('/', async c => c.json({ data: await service.list() }))
    .post('/', zValidator('json', eventHighlightInput), async c =>
      c.json({ data: await service.create(c.req.valid('json')) }, 201),
    )
    .put('/:id', zValidator('param', params), zValidator('json', eventHighlightInput), async c => {
      const row = await service.update(c.req.valid('param').id, c.req.valid('json'));
      return row ? c.json({ data: row }) : c.json({ message: 'Highlight not found.' }, 404);
    })
    .delete('/:id', zValidator('param', params), async c => {
      const removed = await service.remove(c.req.valid('param').id);
      return removed
        ? c.json({ data: { success: true } })
        : c.json({ message: 'Highlight not found.' }, 404);
    });
}

export const eventHighlightsRoute = createEventHighlightsRoute();

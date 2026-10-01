import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { calendarSharingService } from '../../../../lib/tournaments/calendarSharing.ts';

export const teamsIdEventsGetRoute = new Hono<AuthExtension>()
  .use('*', async (c, next) => {
    c.header('Cache-Control', 'private, no-store');
    if (!c.get('user')) return c.json({ message: 'Unauthorized' }, 401);
    await next();
  })
  .get(
    '/',
    zValidator('param', z.object({ id: z.uuid() })),
    zValidator(
      'query',
      z.object({
        from: z.iso.date().optional(),
      }),
    ),
    async c => {
      const events = await calendarSharingService.teamEvents(
        c.req.valid('param').id,
        c.get('user')!.id,
        c.req.valid('query').from ?? new Date().toISOString().slice(0, 10),
      );
      return events
        ? c.json({ data: events })
        : c.json({ message: 'You must be a team member to view team events.' }, 403);
    },
  );

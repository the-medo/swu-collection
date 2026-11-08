import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthExtension } from '../../../../../../auth/auth.ts';
import { getLiveWatchedPlayerRounds } from '../../../../../../lib/live-tournaments/tournamentWeekendLiveHome.ts';

export const tournamentWeekendWatchedPlayerRoundsGetRoute = new Hono<AuthExtension>().get(
  '/',
  zValidator('param', z.object({ id: z.guid(), tournamentId: z.guid() })),
  zValidator('query', z.object({ displayName: z.string().min(1).max(255) })),
  async c => {
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const { id, tournamentId } = c.req.valid('param');
    const { displayName } = c.req.valid('query');
    const data = await getLiveWatchedPlayerRounds(id, tournamentId, displayName, user.id);
    if (!data) return c.json({ message: 'Watched player or tournament not found' }, 404);

    return c.json({ data });
  },
);

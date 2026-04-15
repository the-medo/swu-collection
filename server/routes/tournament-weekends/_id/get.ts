import { Hono } from 'hono';
import { z } from 'zod';
import type { AuthExtension } from '../../../auth/auth.ts';
import { getTournamentWeekendDetail } from '../../../lib/live-tournaments/tournamentWeekendDetail.ts';

export const tournamentWeekendIdGetRoute = new Hono<AuthExtension>().get('/', async c => {
  const weekendId = z.guid().parse(c.req.param('id'));
  const user = c.get('user');
  const data = await getTournamentWeekendDetail(weekendId, user?.id);

  if (!data) {
    return c.json({ message: 'Tournament weekend not found' }, 404);
  }

  return c.json({ data });
});

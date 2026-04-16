import { Hono } from 'hono';
import { z } from 'zod';
import type { AuthExtension } from '../../../auth/auth.ts';
import { userHasAdminAccess } from '../../../lib/utils/userHasAdminAccess.ts';
import { getTournamentWeekendDetail } from '../../../lib/live-tournaments/tournamentWeekendDetail.ts';

export const tournamentWeekendIdGetRoute = new Hono<AuthExtension>().get('/', async c => {
  const weekendId = z.guid().parse(c.req.param('id'));
  const user = c.get('user');
  const includeUnapprovedResources = user ? await userHasAdminAccess(user.id) : false;
  const data = await getTournamentWeekendDetail(weekendId, user?.id, {
    includeUnapprovedResources,
  });

  if (!data) {
    return c.json({ message: 'Tournament weekend not found' }, 404);
  }

  return c.json({ data });
});

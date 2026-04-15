import { Hono } from 'hono';
import { z } from 'zod';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { requireAdmin } from '../../../../auth/requireAdmin.ts';
import { checkTournamentWeekend } from '../../../../lib/live-tournaments';

export const tournamentWeekendIdCheckPostRoute = new Hono<AuthExtension>().post('/', async c => {
  const admin = await requireAdmin(c);
  if (admin.response) return admin.response;

  const weekendId = z.guid().parse(c.req.param('id'));
  const data = await checkTournamentWeekend(weekendId);

  if (!data) {
    return c.json({ message: 'Tournament weekend not found' }, 404);
  }

  return c.json({
    message: 'Live tournament checks completed.',
    data,
  });
});

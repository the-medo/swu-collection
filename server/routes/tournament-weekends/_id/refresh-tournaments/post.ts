import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { db } from '../../../../db';
import { tournamentWeekend } from '../../../../db/schema/tournament_weekend.ts';
import { syncTournamentWeekendTournaments } from '../../../../lib/live-tournaments/tournamentWeekendMaintenance.ts';
import { requireAdmin } from '../../../../auth/requireAdmin.ts';

export const tournamentWeekendIdRefreshTournamentsPostRoute = new Hono<AuthExtension>().post(
  '/',
  async c => {
    const admin = await requireAdmin(c);
    if (admin.response) return admin.response;

    const weekendId = z.guid().parse(c.req.param('id'));
    const weekend = (
      await db.select().from(tournamentWeekend).where(eq(tournamentWeekend.id, weekendId)).limit(1)
    )[0];

    if (!weekend) {
      return c.json({ message: 'Tournament weekend not found' }, 404);
    }

    const sync = await syncTournamentWeekendTournaments(weekend.id, weekend.date);
    const refreshedWeekend = (
      await db.select().from(tournamentWeekend).where(eq(tournamentWeekend.id, weekendId)).limit(1)
    )[0];

    return c.json({
      data: {
        weekend: refreshedWeekend,
        sync,
      },
    });
  },
);

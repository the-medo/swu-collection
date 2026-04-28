import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import type { AuthExtension } from '../../../auth/auth.ts';
import { db } from '../../../db';
import { tournamentWeekend } from '../../../db/schema/tournament_weekend.ts';
import { getLiveTournamentHome } from '../../../lib/live-tournaments/tournamentWeekendLiveHome.ts';

export const tournamentWeekendsLiveGetRoute = new Hono<AuthExtension>().get('/', async c => {
  const liveWeekend = (
    await db
      .select({ id: tournamentWeekend.id })
      .from(tournamentWeekend)
      .where(eq(tournamentWeekend.isLive, true))
      .limit(1)
  )[0];

  if (!liveWeekend) {
    return c.json({ data: null });
  }

  const user = c.get('user');
  const data = await getLiveTournamentHome(liveWeekend.id, user?.id);

  return c.json({ data });
});

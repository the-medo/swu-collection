import { Hono } from 'hono';
import { desc } from 'drizzle-orm';
import type { AuthExtension } from '../../auth/auth.ts';
import { db } from '../../db';
import { tournamentWeekend } from '../../db/schema/tournament_weekend.ts';

export const tournamentWeekendsGetRoute = new Hono<AuthExtension>().get('/', async c => {
  const weekends = await db
    .select()
    .from(tournamentWeekend)
    .orderBy(desc(tournamentWeekend.date), desc(tournamentWeekend.createdAt));

  return c.json({ data: weekends });
});

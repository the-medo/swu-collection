import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { AuthExtension } from '../../auth/auth.ts';
import { db } from '../../db';
import { tournamentWeekend } from '../../db/schema/tournament_weekend.ts';
import {
  isSaturdayDateString,
  syncTournamentWeekendTournaments,
  zSaturdayDateMessage,
} from '../../lib/live-tournaments/tournamentWeekendMaintenance.ts';
import { requireAdmin } from '../../auth/requireAdmin.ts';

const zTournamentWeekendCreateRequest = z.object({
  name: z.string().trim().min(1).max(255),
  date: z.string().refine(isSaturdayDateString, zSaturdayDateMessage),
});

export const tournamentWeekendsPostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('json', zTournamentWeekendCreateRequest),
  async c => {
    const admin = await requireAdmin(c);
    if (admin.response) return admin.response;

    const data = c.req.valid('json');
    const weekend = (
      await db
        .insert(tournamentWeekend)
        .values({
          name: data.name,
          date: data.date,
          updatedAt: sql`NOW()`,
        })
        .returning()
    )[0];

    const syncResult = await syncTournamentWeekendTournaments(weekend.id, weekend.date);
    const refreshedWeekend = (
      await db.select().from(tournamentWeekend).where(eq(tournamentWeekend.id, weekend.id))
    )[0];

    return c.json(
      {
        data: {
          weekend: refreshedWeekend ?? weekend,
          sync: syncResult,
        },
      },
      201,
    );
  },
);

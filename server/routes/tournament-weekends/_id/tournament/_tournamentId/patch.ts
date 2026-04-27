import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { AuthExtension } from '../../../../../auth/auth.ts';
import { requireAdmin } from '../../../../../auth/requireAdmin.ts';
import { db } from '../../../../../db';
import { tournamentWeekendTournament } from '../../../../../db/schema/tournament_weekend.ts';

const zTournamentWeekendTournamentUpdateRequest = z
  .object({
    isLiveCheckEnabled: z.boolean().optional(),
  })
  .refine(data => Object.keys(data).length > 0, {
    message: 'At least one field must be provided.',
  });

export const tournamentWeekendIdTournamentTournamentIdPatchRoute = new Hono<AuthExtension>().patch(
  '/',
  zValidator('json', zTournamentWeekendTournamentUpdateRequest),
  async c => {
    const admin = await requireAdmin(c);
    if (admin.response) return admin.response;

    const weekendId = z.guid().parse(c.req.param('id'));
    const tournamentId = z.guid().parse(c.req.param('tournamentId'));
    const data = c.req.valid('json');

    const [updatedTournament] = await db
      .update(tournamentWeekendTournament)
      .set({
        ...(data.isLiveCheckEnabled !== undefined
          ? { isLiveCheckEnabled: data.isLiveCheckEnabled }
          : {}),
        updatedAt: sql`NOW()`,
      })
      .where(
        and(
          eq(tournamentWeekendTournament.tournamentWeekendId, weekendId),
          eq(tournamentWeekendTournament.tournamentId, tournamentId),
        ),
      )
      .returning();

    if (!updatedTournament) {
      return c.json({ message: 'Tournament weekend tournament not found' }, 404);
    }

    return c.json({ data: updatedTournament });
  },
);

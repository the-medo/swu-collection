import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { asc, eq } from 'drizzle-orm';
import type { AuthExtension } from '../../../../../auth/auth.ts';
import { requireAdmin } from '../../../../../auth/requireAdmin.ts';
import { db } from '../../../../../db';
import { tournamentMatch } from '../../../../../db/schema/tournament_match.ts';
import { getAdminTournament, zTournamentIdParams } from '../lib.ts';

export const adminTournamentIdMatchesGetRoute = new Hono<AuthExtension>().get(
  '/',
  zValidator('param', zTournamentIdParams),
  async c => {
    const admin = await requireAdmin(c);
    if (admin.response) return admin.response;

    const { tournamentId } = c.req.valid('param');
    const selectedTournament = await getAdminTournament(tournamentId);

    if (!selectedTournament) {
      return c.json({ message: 'Tournament not found' }, 404);
    }

    const matches = await db
      .select()
      .from(tournamentMatch)
      .where(eq(tournamentMatch.tournamentId, tournamentId))
      .orderBy(
        asc(tournamentMatch.round),
        asc(tournamentMatch.p1Username),
        asc(tournamentMatch.id),
      );

    return c.json({ data: matches });
  },
);

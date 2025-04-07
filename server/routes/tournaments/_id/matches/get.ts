import { Hono } from 'hono';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../../../../db';
import { tournamentMatch as tournamentMatchTable } from '../../../../db/schema/tournament_match.ts';

export const tournamentIdMatchesGetRoute = new Hono<AuthExtension>().get('/', async c => {
  const paramTournamentId = z.string().uuid().parse(c.req.param('id'));

  // Query all matches for this tournament
  const tournamentMatches = await db
    .select()
    .from(tournamentMatchTable)
    .where(eq(tournamentMatchTable.tournamentId, paramTournamentId))
    .orderBy(tournamentMatchTable.round);

  return c.json({ data: tournamentMatches });
});

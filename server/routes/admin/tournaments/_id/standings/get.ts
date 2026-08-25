import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { asc, desc, eq } from 'drizzle-orm';
import type { AuthExtension } from '../../../../../auth/auth.ts';
import { requireAdmin } from '../../../../../auth/requireAdmin.ts';
import { db } from '../../../../../db';
import { deck } from '../../../../../db/schema/deck.ts';
import { tournamentDeck } from '../../../../../db/schema/tournament_deck.ts';
import { getAdminTournament, zTournamentIdParams } from '../lib.ts';

export const adminTournamentIdStandingsGetRoute = new Hono<AuthExtension>().get(
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

    const standings = await db
      .select({
        tournamentDeck,
        deck: {
          id: deck.id,
          name: deck.name,
          leaderCardId1: deck.leaderCardId1,
          leaderCardId2: deck.leaderCardId2,
          baseCardId: deck.baseCardId,
        },
      })
      .from(tournamentDeck)
      .leftJoin(deck, eq(tournamentDeck.deckId, deck.id))
      .where(eq(tournamentDeck.tournamentId, tournamentId))
      .orderBy(
        asc(tournamentDeck.placement),
        desc(tournamentDeck.points),
        asc(tournamentDeck.meleePlayerUsername),
      );

    return c.json({ data: standings });
  },
);

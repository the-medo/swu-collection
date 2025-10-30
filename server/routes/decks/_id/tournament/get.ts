import { Hono } from 'hono';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { z } from 'zod';
import { and, eq, or } from 'drizzle-orm';
import { db } from '../../../../db';
import { tournamentDeck as tournamentDeckTable } from '../../../../db/schema/tournament_deck.ts';
import { tournament as tournamentTable } from '../../../../db/schema/tournament.ts';
import { tournamentMatch as tournamentMatchTable } from '../../../../db/schema/tournament_match.ts';
import { deck as deckTable } from '../../../../db/schema/deck.ts';
import { deckInformation as deckInformationTable } from '../../../../db/schema/deck_information.ts';
import { selectDeck, selectDeckInformation } from '../../../deck.ts';
import { selectTournament } from '../../../tournament.ts';

export const deckIdTournamentGetRoute = new Hono<AuthExtension>().get('/', async c => {
  const paramDeckId = z.guid().parse(c.req.param('id'));

  // First, check if the deck was in a tournament
  const tournamentDeckData = (
    await db
      .select({
        tournamentDeck: tournamentDeckTable,
        tournament: selectTournament,
      })
      .from(tournamentDeckTable)
      .innerJoin(tournamentTable, eq(tournamentDeckTable.tournamentId, tournamentTable.id))
      .where(eq(tournamentDeckTable.deckId, paramDeckId))
      .limit(1)
  )[0];

  if (!tournamentDeckData) {
    return c.json({ data: null });
  }

  // Now get all matches where this deck participated
  const matches = await db
    .select({
      match: tournamentMatchTable,
      opponentDeck: selectDeck,
      opponentDeckInfo: selectDeckInformation,
    })
    .from(tournamentMatchTable)
    .leftJoin(
      deckTable,
      and(
        eq(tournamentMatchTable.tournamentId, tournamentDeckData.tournament.id),
        or(
          // Join to get the opponent's deck when this deck is player 1
          and(
            eq(tournamentMatchTable.p1DeckId, paramDeckId),
            eq(deckTable.id, tournamentMatchTable.p2DeckId),
          ),
          // Join to get the opponent's deck when this deck is player 2
          and(
            eq(tournamentMatchTable.p2DeckId, paramDeckId),
            eq(deckTable.id, tournamentMatchTable.p1DeckId),
          ),
        ),
      ),
    )
    .leftJoin(deckInformationTable, eq(deckTable.id, deckInformationTable.deckId))
    .where(
      and(
        eq(tournamentMatchTable.tournamentId, tournamentDeckData.tournament.id),
        or(
          eq(tournamentMatchTable.p1DeckId, paramDeckId),
          eq(tournamentMatchTable.p2DeckId, paramDeckId),
        ),
      ),
    )
    .orderBy(tournamentMatchTable.round);

  return c.json({
    data: {
      tournament: tournamentDeckData.tournament,
      tournamentDeck: tournamentDeckData.tournamentDeck,
      matches: matches,
    },
  });
});

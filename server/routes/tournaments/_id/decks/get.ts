import { Hono } from 'hono';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../../../../db';
import { tournamentDeck as tournamentDeckTable } from '../../../../db/schema/tournament_deck.ts';
import { deck as deckTable } from '../../../../db/schema/deck.ts';
import { deckInformation as deckInformationTable } from '../../../../db/schema/deck_information.ts';
import { selectDeck, selectDeckInformation } from '../../../deck.ts';

export const tournamentIdDecksGetRoute = new Hono<AuthExtension>().get('/', async c => {
  const paramTournamentId = z.string().uuid().parse(c.req.param('id'));

  // Query tournament decks with joined deck and deck information
  const tournamentDecks = await db
    .select({
      tournamentDeck: tournamentDeckTable,
      deck: selectDeck,
      deckInformation: selectDeckInformation,
    })
    .from(tournamentDeckTable)
    .leftJoin(deckTable, eq(tournamentDeckTable.deckId, deckTable.id))
    .leftJoin(deckInformationTable, eq(tournamentDeckTable.deckId, deckInformationTable.deckId))
    .where(eq(tournamentDeckTable.tournamentId, paramTournamentId));

  if (!tournamentDecks || tournamentDecks.length === 0) {
    return c.json({ data: [] });
  }

  return c.json({ data: tournamentDecks });
});

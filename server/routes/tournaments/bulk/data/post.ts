import { Hono } from 'hono';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { z } from 'zod';
import { eq, inArray } from 'drizzle-orm';
import { db } from '../../../../db';
import {
  type TournamentMatch,
  tournamentMatch as tournamentMatchTable,
} from '../../../../db/schema/tournament_match.ts';
import {
  type TournamentDeck,
  tournamentDeck as tournamentDeckTable,
} from '../../../../db/schema/tournament_deck.ts';
import { deck as deckTable } from '../../../../db/schema/deck.ts';
import { deckInformation as deckInformationTable } from '../../../../db/schema/deck_information.ts';
import { zValidator } from '@hono/zod-validator';

export interface TournamentsBulkResponse {
  matches: Record<string, any[]>; // Tournament matches grouped by tournament ID
  decks: Record<string, any[]>; // Tournament decks grouped by tournament ID
}

// Define request body schema
const zBulkTournamentsBody = z.object({
  ids: z.array(z.string().uuid()).refine(ids => ids.length > 0, {
    message: 'At least one tournament ID must be provided',
  }),
});

export const tournamentsBulkPostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('json', zBulkTournamentsBody),
  async c => {
    const { ids } = await c.req.valid('json');

    // Query 1: Get all matches for the requested tournaments
    const tournamentMatches = await db
      .select()
      .from(tournamentMatchTable)
      .where(inArray(tournamentMatchTable.tournamentId, ids))
      .orderBy(tournamentMatchTable.round);

    // Query 2: Get all decks for the requested tournaments
    const tournamentDecks = await db
      .select({
        tournamentDeck: tournamentDeckTable,
        deck: deckTable,
        deckInformation: deckInformationTable,
      })
      .from(tournamentDeckTable)
      .leftJoin(deckTable, eq(tournamentDeckTable.deckId, deckTable.id))
      .leftJoin(deckInformationTable, eq(tournamentDeckTable.deckId, deckInformationTable.deckId))
      .where(inArray(tournamentDeckTable.tournamentId, ids));

    // Organize the results
    const result: TournamentsBulkResponse = {
      matches: tournamentMatches.reduce(
        (acc, match) => {
          if (!acc[match.tournamentId]) {
            acc[match.tournamentId] = [];
          }
          acc[match.tournamentId].push(match);
          return acc;
        },
        {} as Record<string, TournamentMatch[]>,
      ),
      decks: tournamentDecks.reduce(
        (acc, deck) => {
          const tournamentId = deck.tournamentDeck.tournamentId;
          if (!acc[tournamentId]) {
            acc[tournamentId] = [];
          }
          acc[tournamentId].push(deck);
          return acc;
        },
        {} as Record<string, any[]>,
      ),
    };

    return c.json(result);
  },
);

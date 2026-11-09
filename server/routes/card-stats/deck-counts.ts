import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { and, count, eq, isNotNull, ne } from 'drizzle-orm';
import { z } from 'zod';
import type { AuthExtension } from '../../auth/auth.ts';
import { db } from '../../db';
import { deck } from '../../db/schema/deck.ts';
import { tournament } from '../../db/schema/tournament.ts';
import { tournamentDeck } from '../../db/schema/tournament_deck.ts';
import { buildCardDeckCounts } from '../../../shared/lib/cardDeckCounts.ts';

// Whole-meta card statistics include every tournament in the meta, independently
// of the tournament filters used by the frontend's deck loader.
export const cardStatsDeckCountsRoute = new Hono<AuthExtension>().get(
  '/',
  zValidator('query', z.object({ meta_id: z.coerce.number().int().positive() })),
  async c => {
    const { meta_id } = c.req.valid('query');
    const rows = await db
      .select({
        leaderCardId: deck.leaderCardId1,
        baseCardId: deck.baseCardId,
        count: count(),
      })
      .from(tournamentDeck)
      .innerJoin(tournament, eq(tournament.id, tournamentDeck.tournamentId))
      .innerJoin(deck, eq(deck.id, tournamentDeck.deckId))
      .where(
        and(
          eq(tournament.meta, meta_id),
          isNotNull(deck.leaderCardId1),
          ne(deck.leaderCardId1, ''),
          isNotNull(deck.baseCardId),
          ne(deck.baseCardId, ''),
        ),
      )
      .groupBy(deck.leaderCardId1, deck.baseCardId);

    return c.json({ data: buildCardDeckCounts(rows) });
  },
);

import { Hono } from 'hono';
import type { AuthExtension } from '../../auth/auth.ts';
import { z } from 'zod';
import { and, eq, inArray, or, sql } from 'drizzle-orm';
import { deck as deckTable } from '../../db/schema/deck.ts';
import { type DeckCard, deckCard as deckCardTable } from '../../db/schema/deck_card.ts';
import { db } from '../../db';
import { selectUser } from '../user.ts';
import { user as userTable } from '../../db/schema/auth-schema.ts';
import { selectDeck } from '../deck.ts';
import { userDeckFavorite } from '../../db/schema/user_deck_favorite.ts';
import type { Deck, DeckData } from '../../../types/Deck.ts';

export interface DecksBulkResponse {
  decks: Record<string, DeckData | undefined>;
  cards: Record<string, DeckCard[]>;
}

// Define query parameters schema
const zBulkDecksQueryParams = z.object({
  ids: z
    .string()
    .transform(val => val.split(','))
    .refine(ids => ids.length > 0, {
      message: 'At least one deck ID must be provided',
    }),
});

export const decksBulkGetRoute = new Hono<AuthExtension>().get('/', async c => {
  const { ids } = z.object({ ids: zBulkDecksQueryParams.shape.ids }).parse(c.req.query());
  const user = c.get('user');

  const isPublic = eq(deckTable.public, true);
  const isOwner = user ? eq(deckTable.userId, user.id) : null;

  // Query 1: Get deck data for all requested deck IDs
  let query = db
    .select({
      user: selectUser,
      deck: selectDeck,
      isFavorite: user ? userDeckFavorite.createdAt : sql.raw('NULL'),
    })
    .from(deckTable)
    .innerJoin(userTable, eq(deckTable.userId, userTable.id))
    .$dynamic();

  // Only add the left join if the user is logged in
  if (user) {
    query = query.leftJoin(
      userDeckFavorite,
      and(eq(userDeckFavorite.userId, user.id), eq(userDeckFavorite.deckId, deckTable.id)),
    );
  }

  // Apply where condition
  query = query.where(and(inArray(deckTable.id, ids), isOwner ? or(isOwner, isPublic) : isPublic));

  const decksData = await query;

  // If no decks found, return empty result
  if (decksData.length === 0) {
    return c.json({ decks: {}, cards: {} });
  }

  // Extract the IDs of decks that were found
  const foundDeckIds = decksData.map(deck => deck.deck.id);

  // Query 2: Get all cards for the found decks
  const deckCards = await db
    .select({
      deckId: deckCardTable.deckId,
      cardId: deckCardTable.cardId,
      board: deckCardTable.board,
      note: deckCardTable.note,
      quantity: deckCardTable.quantity,
    })
    .from(deckCardTable)
    .where(inArray(deckCardTable.deckId, foundDeckIds));

  // Organize the results
  const result: DecksBulkResponse = {
    decks: decksData.reduce(
      (acc, deck) => {
        acc[deck.deck.id] = deck as unknown as DeckData;
        return acc;
      },
      {} as DecksBulkResponse['decks'], //
    ),
    cards: deckCards.reduce(
      (acc, card) => {
        if (!acc[card.deckId]) {
          acc[card.deckId] = [];
        }
        acc[card.deckId].push(card);
        return acc;
      },
      {} as DecksBulkResponse['cards'],
    ),
  };

  return c.json(result);
});

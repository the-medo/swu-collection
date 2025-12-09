import { Hono } from 'hono';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { z } from 'zod';
import { and, eq, gte, or } from 'drizzle-orm';
import { deck as deckTable } from '../../../../db/schema/deck.ts';
import { deckCard as deckCardTable } from '../../../../db/schema/deck_card.ts';
import { cardPoolDeckCards } from '../../../../db/schema/card_pool_deck.ts';
import { cardPoolCards } from '../../../../db/schema/card_pool.ts';
import { db } from '../../../../db';
import { selectUser } from '../../../user.ts';
import { user as userTable } from '../../../../db/schema/auth-schema.ts';
import { selectDeck } from '../../../deck.ts';
import { cardList } from '../../../../db/lists.ts';
import { createDeckJsonExport } from '../../../../lib/decks/deckExport.ts';
import type { Deck } from '../../../../../types/Deck.ts';
import type { User } from '../../../../../types/User.ts';
import type { DeckCard } from '../../../../../types/ZDeckCard.ts';
import { transformCardPoolDeckCardsToDeckCards } from '../../../../lib/decks/transformCardPoolDeckCards.ts';

export const deckIdJsonGetRoute = new Hono<AuthExtension>().get('/', async c => {
  const rawId = c.req.param('id') ?? '';
  const normalizedId = /^[0-9a-fA-F]{32}$/.test(rawId)
    ? `${rawId.slice(0, 8)}-${rawId.slice(8, 12)}-${rawId.slice(12, 16)}-${rawId.slice(16, 20)}-${rawId.slice(20)}`.toLowerCase()
    : rawId;
  const paramDeckId = z.guid().parse(normalizedId);
  const user = c.get('user');

  const isPublicOrUnlisted = gte(deckTable.public, 1);
  const isOwner = user ? eq(deckTable.userId, user.id) : null;

  // Start with the base query to get deck and user data
  let query = db
    .select({
      user: selectUser,
      deck: selectDeck,
    })
    .from(deckTable)
    .innerJoin(userTable, eq(deckTable.userId, userTable.id))
    .$dynamic();

  // Apply where condition - only allow access if deck is public or user is the owner
  query = query.where(
    and(
      eq(deckTable.id, paramDeckId),
      isOwner ? or(isOwner, isPublicOrUnlisted) : isPublicOrUnlisted,
    ),
  );

  const deckData = (await query)[0];

  if (!deckData) {
    return c.json({ message: "Deck doesn't exist or you don't have access to it" }, 404);
  }

  // Fetch deck cards (from deck_card or from card pool, based on deck.cardPoolId)
  let deckCards: DeckCard[];

  if (!deckData.deck.cardPoolId) {
    const rows = await db
      .select()
      .from(deckCardTable)
      .where(eq(deckCardTable.deckId, paramDeckId));

    if (!rows) {
      return c.json({ message: "Couldn't fetch deck cards" }, 500);
    }
    deckCards = rows as unknown as DeckCard[];
  } else {
    // Collect deck cards from card_pool_deck_cards mapped to card ids via card_pool_cards
    const poolRows = await db
      .select({
        cardId: cardPoolCards.cardId,
        location: cardPoolDeckCards.location,
      })
      .from(cardPoolDeckCards)
      .innerJoin(deckTable, eq(cardPoolDeckCards.deckId, deckTable.id))
      .innerJoin(
        cardPoolCards,
        and(
          eq(cardPoolCards.cardPoolId, deckTable.cardPoolId!),
          eq(cardPoolCards.cardPoolNumber, cardPoolDeckCards.cardPoolNumber),
        ),
      )
      .where(
        and(
          eq(deckTable.id, paramDeckId),
          isOwner ? or(isOwner, isPublicOrUnlisted) : isPublicOrUnlisted,
        ),
      );

    deckCards = transformCardPoolDeckCardsToDeckCards(poolRows, paramDeckId);
  }

  // Generate JSON export using the existing function
  const jsonData = createDeckJsonExport(
    deckData.deck as unknown as Deck,
    deckCards,
    deckData.user as unknown as User,
    cardList,
  );

  return c.json(jsonData);
});

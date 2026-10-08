import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { and, asc, desc, eq, exists, gt, inArray, isNotNull, isNull, or } from 'drizzle-orm';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { db } from '../../../../db';
import { deck } from '../../../../db/schema/deck.ts';
import { deckCard } from '../../../../db/schema/deck_card.ts';
import { user } from '../../../../db/schema/auth-schema.ts';
import { cardPoolCards } from '../../../../db/schema/card_pool.ts';
import { cardPoolDeckCards } from '../../../../db/schema/card_pool_deck.ts';
import { entityPrice, type EntityPrice } from '../../../../db/schema/entity_price.ts';

export const decksForCardGetRoute = new Hono<AuthExtension>().get(
  '/',
  zValidator('param', z.object({ cardId: z.string().trim().min(1).max(255) })),
  async c => {
    const { cardId } = c.req.valid('param');
    // Public discovery has the same visibility policy for every viewer.
    c.header('Cache-Control', 'no-store');

    const normalDeckContainsCard = db
      .select({ deckId: deckCard.deckId })
      .from(deckCard)
      .where(
        and(
          eq(deckCard.deckId, deck.id),
          eq(deckCard.cardId, cardId),
          gt(deckCard.quantity, 0),
          inArray(deckCard.board, [1, 2]),
        ),
      );

    const limitedDeckContainsCard = db
      .select({ deckId: cardPoolDeckCards.deckId })
      .from(cardPoolDeckCards)
      .innerJoin(
        cardPoolCards,
        and(
          eq(cardPoolCards.cardPoolId, deck.cardPoolId),
          eq(cardPoolCards.cardPoolNumber, cardPoolDeckCards.cardPoolNumber),
        ),
      )
      .where(
        and(
          eq(cardPoolDeckCards.deckId, deck.id),
          eq(cardPoolCards.cardId, cardId),
          eq(cardPoolDeckCards.location, 'deck'),
        ),
      );

    const decks = await db
      .select({
        deck,
        user: { id: user.id, displayName: user.displayName },
      })
      .from(deck)
      .innerJoin(user, eq(deck.userId, user.id))
      .where(
        and(
          eq(deck.public, 1),
          or(
            eq(deck.leaderCardId1, cardId),
            eq(deck.leaderCardId2, cardId),
            eq(deck.baseCardId, cardId),
            and(isNull(deck.cardPoolId), exists(normalDeckContainsCard)),
            and(isNotNull(deck.cardPoolId), exists(limitedDeckContainsCard)),
          ),
        ),
      )
      .orderBy(desc(deck.updatedAt), asc(deck.id))
      .limit(10);

    const pricesByDeck = new Map<string, EntityPrice[]>();
    if (decks.length) {
      const prices = (await db
        .select()
        .from(entityPrice)
        .where(
          and(
            eq(entityPrice.type, 'deck'),
            inArray(
              entityPrice.entityId,
              decks.map(item => item.deck.id),
            ),
          ),
        )
        .orderBy(asc(entityPrice.sourceType))) as EntityPrice[];
      for (const price of prices) {
        const existing = pricesByDeck.get(price.entityId) ?? [];
        existing.push(price);
        pricesByDeck.set(price.entityId, existing);
      }
    }

    return c.json({
      data: decks.map(item => ({ ...item, entityPrices: pricesByDeck.get(item.deck.id) ?? [] })),
    });
  },
);

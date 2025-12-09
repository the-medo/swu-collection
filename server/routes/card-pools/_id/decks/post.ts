import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { visibilityToPublicMap, Visibility } from '../../../../../shared/types/visibility.ts';
import { db } from '../../../../db';
import { deck as deckTable } from '../../../../db/schema/deck.ts';
import { cardPoolDecks, cardPoolDeckCards } from '../../../../db/schema/card_pool_deck.ts';
import { cardPoolCards } from '../../../../db/schema/card_pool.ts';
import { eq } from 'drizzle-orm';
import { getCardPoolBasedOnIdAndUser } from '../../../../lib/card-pools/card-pool-access.ts';

const zParams = z.object({ id: z.uuid() });
const zBody = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  visibility: z.enum(Visibility).default(Visibility.Unlisted),
});

export const cardPoolsIdDecksPostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('param', zParams),
  zValidator('json', zBody),
  async c => {
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const { id } = c.req.valid('param');
    const body = c.req.valid('json');

    // 1) Check access to the card pool
    const pool = await getCardPoolBasedOnIdAndUser(id, user);
    if (!pool) return c.json({ message: 'Card pool not found' }, 404);

    // 2) Determine deck format based on pool type
    // format 3 => sealed/prerelease, format 4 => draft
    const formatId = pool.type === 'draft' ? 4 : 3;

    const result = await db.transaction(async tx => {
      // 2) Create deck row
      const inserted = await tx
        .insert(deckTable)
        .values({
          userId: user.id,
          format: formatId,
          name: body.name ?? '',
          description: body.description ?? '',
          public: visibilityToPublicMap[body.visibility],
          cardPoolId: id,
        })
        .returning();

      const newDeck = inserted[0];
      const newDeckId = newDeck.id;

      // 3) Insert into card_pool_decks
      await tx.insert(cardPoolDecks).values({
        deckId: newDeckId,
        cardPoolId: id,
        userId: user.id,
        visibility: body.visibility,
      });

      // 4) Pre-populate card_pool_deck_cards from card_pool_cards
      const poolCards = await tx
        .select({ cardPoolNumber: cardPoolCards.cardPoolNumber })
        .from(cardPoolCards)
        .where(eq(cardPoolCards.cardPoolId, id));

      if (poolCards.length > 0) {
        const deckCards = poolCards.map(pc => ({
          deckId: newDeckId,
          cardPoolNumber: pc.cardPoolNumber,
          location: 'pool' as const,
        }));

        await tx.insert(cardPoolDeckCards).values(deckCards);
      }

      return { newDeck, createdCardsCount: poolCards.length };
    });

    return c.json(
      {
        data: {
          deck: result.newDeck,
          createdCardsCount: result.createdCardsCount,
        },
      },
      201,
    );
  },
);

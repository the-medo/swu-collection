import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { db } from '../../../../db';
import { and, eq, sql } from 'drizzle-orm';
import {
  cardPools as cardPoolsTable,
  cardPoolCards as cardPoolCardsTable,
} from '../../../../db/schema/card_pool.ts';
import { deck as deckTable } from '../../../../db/schema/deck.ts';
import { cardPoolDecks as cardPoolDecksTable } from '../../../../db/schema/card_pool_deck.ts';
import {
  filterLeadersFromCardPool,
  transformCardPoolToCardPoolCards,
} from '../../../../lib/card-pools/generate-card-pool.ts';
import { findInvalidCardIds } from '../../../../lib/card-pools/validate-card-ids.ts';

const zParams = z.object({ id: z.uuid() });
const zBody = z.object({
  // Full replacement of card pool contents: array of card ids
  cards: z.array(z.string()).min(1),
});

export const cardPoolsIdCardsPutRoute = new Hono<AuthExtension>().put(
  '/',
  zValidator('param', zParams),
  zValidator('json', zBody),
  async c => {
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const { id } = c.req.valid('param');
    const body = c.req.valid('json');

    try {
      const result = await db.transaction(async tx => {
        // Ensure pool exists and is owned by the user and is custom
        const [pool] = await tx
          .select({ id: cardPoolsTable.id, userId: cardPoolsTable.userId, custom: cardPoolsTable.custom })
          .from(cardPoolsTable)
          .where(eq(cardPoolsTable.id, id))
          .limit(1);

        if (!pool || pool.userId !== user.id) {
          return { status: 'not_found' as const };
        }
        if (!pool.custom) {
          return { status: 'not_custom' as const };
        }

        // Check usage: referenced by any deck or card_pool_decks row
        const [[{ count: deckRefCountStr }], [{ count: cpdRefCountStr }]] = await Promise.all([
          tx.select({ count: sql<string>`count(*)` }).from(deckTable).where(eq(deckTable.cardPoolId, id)),
          tx
            .select({ count: sql<string>`count(*)` })
            .from(cardPoolDecksTable)
            .where(eq(cardPoolDecksTable.cardPoolId, id)),
        ]);
        const deckRefCount = Number(deckRefCountStr ?? '0');
        const cpdRefCount = Number(cpdRefCountStr ?? '0');
        const isUsed = deckRefCount > 0 || cpdRefCount > 0;
        if (isUsed) {
          return { status: 'used' as const };
        }

        // Validate card ids exist in cardList
        const invalid = findInvalidCardIds(body.cards);
        if (invalid.length > 0) {
          return { status: 'invalid_cards' as const, invalid };
        }

        // Transform to rows
        const rows = transformCardPoolToCardPoolCards(body.cards, id);

        // Replace rows
        await tx.delete(cardPoolCardsTable).where(eq(cardPoolCardsTable.cardPoolId, id));
        if (rows.length > 0) {
          await tx.insert(cardPoolCardsTable).values(rows);
        }

        // Update pool status, leaders, updated_at
        const leaders = filterLeadersFromCardPool(body.cards);
        const [updated] = await tx
          .update(cardPoolsTable)
          .set({ status: 'ready', updatedAt: new Date(), leaders: leaders.join(',') })
          .where(and(eq(cardPoolsTable.id, id), eq(cardPoolsTable.userId, user.id)))
          .returning();

        if (!updated) return { status: 'error' as const };

        return { status: 'ok' as const, replaced: rows.length, leaders };
      });

      if (result.status === 'not_found') return c.json({ message: 'Card pool not found' }, 404);
      if (result.status === 'not_custom')
        return c.json({ message: 'Only custom card pools can import/replace cards' }, 400);
      if (result.status === 'used')
        return c.json({ message: 'Card pool already used in decks; cards cannot be replaced' }, 400);
      if (result.status === 'invalid_cards')
        return c.json({ message: 'Invalid card ids supplied', invalid: result.invalid }, 400);
      if (result.status === 'ok')
        return c.json({ data: { id, replaced: result.replaced, leaders: result.leaders } });

      return c.json({ message: 'Failed to replace card pool cards' }, 500);
    } catch (e) {
      return c.json({ message: 'Failed to replace card pool cards' }, 500);
    }
  },
);

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthExtension } from '../../../auth/auth.ts';
import { db } from '../../../db';
import { and, eq, sql } from 'drizzle-orm';
import {
  cardPools as cardPoolsTable,
  cardPoolCards as cardPoolCardsTable,
} from '../../../db/schema/card_pool.ts';
import { deck as deckTable } from '../../../db/schema/deck.ts';
import { cardPoolDecks as cardPoolDecksTable } from '../../../db/schema/card_pool_deck.ts';

const zParams = z.object({ id: z.uuid() });

export const cardPoolsIdDeleteRoute = new Hono<AuthExtension>().delete(
  '/',
  zValidator('param', zParams),
  async c => {
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const { id } = c.req.valid('param');

    try {
      const result = await db.transaction(async tx => {
        // Ensure pool exists and is owned by the user
        const [pool] = await tx
          .select({
            id: cardPoolsTable.id,
            userId: cardPoolsTable.userId,
            archivedAt: cardPoolsTable.archivedAt,
          })
          .from(cardPoolsTable)
          .where(eq(cardPoolsTable.id, id))
          .limit(1);

        if (!pool || pool.userId !== user.id) {
          // Hide existence if not owned
          return { status: 'not_found' as const };
        }

        // Check usage: referenced by any deck or card_pool_decks row
        const [[{ count: deckRefCountStr }], [{ count: cpdRefCountStr }]] = await Promise.all([
          tx
            .select({ count: sql<string>`count(*)` })
            .from(deckTable)
            .where(eq(deckTable.cardPoolId, id)),
          tx
            .select({ count: sql<string>`count(*)` })
            .from(cardPoolDecksTable)
            .where(eq(cardPoolDecksTable.cardPoolId, id)),
        ]);
        const deckRefCount = Number(deckRefCountStr ?? '0');
        const cpdRefCount = Number(cpdRefCountStr ?? '0');
        const isUsed = deckRefCount > 0 || cpdRefCount > 0;

        if (!isUsed) {
          // Delete dependent cards, then the pool
          await tx.delete(cardPoolCardsTable).where(eq(cardPoolCardsTable.cardPoolId, id));
          await tx
            .delete(cardPoolsTable)
            .where(and(eq(cardPoolsTable.id, id), eq(cardPoolsTable.userId, user.id)));
          return { status: 'deleted' as const };
        }

        // Archive if used (idempotent)
        const [archived] = await tx
          .update(cardPoolsTable)
          .set({ archivedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
          .where(and(eq(cardPoolsTable.id, id), eq(cardPoolsTable.userId, user.id)))
          .returning();

        if (!archived) return { status: 'error' as const };
        return { status: 'archived' as const, archivedAt: archived.archivedAt };
      });

      if (result.status === 'not_found') return c.json({ message: 'Card pool not found' }, 404);
      if (result.status === 'deleted') return c.json({ data: { id, action: 'deleted' } });
      if (result.status === 'archived')
        return c.json({ data: { id, action: 'archived', archivedAt: result.archivedAt } });

      return c.json({ message: 'Failed to delete card pool' }, 500);
    } catch (e) {
      return c.json({ message: 'Failed to delete card pool' }, 500);
    }
  },
);

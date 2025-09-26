import { Hono } from 'hono';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../../../../db';
import { collection as collectionTable } from '../../../../db/schema/collection.ts';
import {
  collectionCard as collectionCardTable,
  type InsertCollectionCard,
} from '../../../../db/schema/collection_card.ts';
import { and, eq, lte, sql } from 'drizzle-orm';
import { updateCollectionUpdatedAt } from '../../../../lib/updateCollectionUpdatedAt.ts';
import { CollectionType } from '../../../../../types/enums.ts';

const zApplyBody = z.object({
  collectionIdToApply: z.string().uuid(),
  operation: z.enum(['add', 'remove']).default('add'),
});

// Apply cards from another collection (public OTHER type) to user's owned collection
export const collectionIdApplyPostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('json', zApplyBody),
  async c => {
    const paramCollectionId = z.string().uuid().parse(c.req.param('id'));
    const { collectionIdToApply, operation } = c.req.valid('json');
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    // Verify original (destination) collection exists and is owned by user
    const destCollectionWhere = eq(collectionTable.id, paramCollectionId);
    const destCollection = (await db.select().from(collectionTable).where(destCollectionWhere))[0];
    if (!destCollection) return c.json({ message: "Card collection doesn't exist" }, 500);
    if (destCollection.userId !== user.id) return c.json({ message: 'Unauthorized' }, 401);

    // Verify source (to apply) collection is public and of type OTHER
    const srcCollectionWhere = eq(collectionTable.id, collectionIdToApply);
    const srcCollection = (await db.select().from(collectionTable).where(srcCollectionWhere))[0];
    if (!srcCollection) return c.json({ message: "Collection to apply doesn't exist" }, 404);
    if (!srcCollection.public)
      return c.json({ message: 'Collection to apply must be public' }, 400);
    if (srcCollection.collectionType !== CollectionType.OTHER)
      return c.json({ message: 'Collection to apply must be a card list' }, 400);

    // Load all cards from source collection
    const srcCards = await db
      .select()
      .from(collectionCardTable)
      .where(eq(collectionCardTable.collectionId, collectionIdToApply));

    // Prepare cards to insert into destination collection
    const negate = operation === 'remove' ? -1 : 1;
    const cardsToInsert: InsertCollectionCard[] = srcCards.map(card => ({
      collectionId: paramCollectionId,
      cardId: card.cardId,
      variantId: card.variantId,
      foil: card.foil,
      condition: card.condition,
      language: card.language ?? null,
      amount: (card.amount ?? 0) * negate,
      note: card.note ?? '',
      price: card.price ?? null,
      amount2: card.amount2 ?? null,
    }));

    // If there are no cards, respond early (but still update timestamp for consistency)
    if (cardsToInsert.length === 0) {
      await updateCollectionUpdatedAt(paramCollectionId);
      return c.json({ data: { changed: 0, deleted: 0, amount: 0 } });
    }

    // Upsert using the same logic as in collectionIdMultiplePostRoute
    const newCollectionCards = await db
      .insert(collectionCardTable)
      .values(cardsToInsert)
      .onConflictDoUpdate({
        target: [
          collectionCardTable.collectionId,
          collectionCardTable.cardId,
          collectionCardTable.variantId,
          collectionCardTable.foil,
          collectionCardTable.condition,
          collectionCardTable.language,
        ],
        set: {
          amount: sql.raw('collection_card.amount + excluded.amount'),
          note: sql.raw('COALESCE(excluded.note, collection_card.note)'),
        },
      })
      .returning();

    // Delete any rows that drop to <= 0
    const deletedCollectionCards = await db
      .delete(collectionCardTable)
      .where(
        and(
          eq(collectionCardTable.collectionId, paramCollectionId),
          lte(collectionCardTable.amount, 0),
        ),
      )
      .returning();

    await updateCollectionUpdatedAt(paramCollectionId);

    return c.json({
      data: {
        changed: newCollectionCards.length - deletedCollectionCards.length,
        deleted: deletedCollectionCards.length,
        amount: cardsToInsert.reduce((s, it) => s + (it.amount ?? 0), 0),
      },
    });
  },
);

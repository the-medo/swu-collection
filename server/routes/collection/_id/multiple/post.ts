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
import { eq, and, lte, sql } from 'drizzle-orm';
import {
  zCollectionCardCreateRequest,
  zCollectionCardCreateRequestAllowNegative,
} from '../../../../../types/ZCollectionCard.ts';
import { updateCollectionUpdatedAt } from '../../../../lib/updateCollectionUpdatedAt.ts';

// Insert or increment many precise collection cards (array input)
export const collectionIdMultiplePostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('json', z.array(zCollectionCardCreateRequestAllowNegative)),
  async c => {
    const paramCollectionId = z.string().uuid().parse(c.req.param('id'));
    const data = c.req.valid('json');
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const collectionId = eq(collectionTable.id, paramCollectionId);
    const col = (await db.select().from(collectionTable).where(collectionId))[0];
    if (!col) return c.json({ message: "Card collection doesn't exist" }, 500);
    if (col.userId !== user.id) return c.json({ message: 'Unauthorized' }, 401);

    const cardCollectionId = eq(collectionCardTable.collectionId, paramCollectionId);

    const cardsToInsert: InsertCollectionCard[] = data.map(item => ({
      collectionId: paramCollectionId,
      cardId: item.cardId,
      variantId: item.variantId,
      foil: item.foil,
      condition: item.condition,
      language: item.language,
      amount: item.amount,
      note: item.note ?? '',
    }));

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

    const deletedCollectionCards = await db
      .delete(collectionCardTable)
      .where(and(cardCollectionId, lte(collectionCardTable.amount, 0)))
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

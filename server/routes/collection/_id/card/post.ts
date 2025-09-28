import { Hono } from 'hono';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { zCollectionCardCreateRequest } from '../../../../../types/ZCollectionCard.ts';
import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
import { collection as collectionTable } from '../../../../db/schema/collection.ts';
import { db } from '../../../../db';
import { collectionCard as collectionCardTable } from '../../../../db/schema/collection_card.ts';
import { updateCollectionUpdatedAt } from '../../../../lib/updateCollectionUpdatedAt.ts';

/**
 * Insert / upsert card(+variant) into collection (wantlist)
 * - only user's collection
 * - in case of amount = 0, delete card from collection
 * */
export const collectionIdCardPostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('json', zCollectionCardCreateRequest),
  async c => {
    const paramCollectionId = z.string().uuid().parse(c.req.param('id'));
    const data = c.req.valid('json');
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const collectionId = eq(collectionTable.id, paramCollectionId);

    const col = (await db.select().from(collectionTable).where(collectionId))[0];
    if (!col) return c.json({ message: "Collection doesn't exist" }, 500);
    if (col.userId !== user.id) return c.json({ message: 'Unauthorized' }, 401);

    const newCollectionCard = await db
      .insert(collectionCardTable)
      .values({ ...data, collectionId: paramCollectionId, amount: data.amount ?? 0 })
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
          amount: sql`${collectionCardTable.amount} + ${data.amount ?? 0}`,
          amount2: sql`${collectionCardTable.amount2} + ${data.amount2 ?? 0}`,
          note: sql`${data.note ?? collectionCardTable.note}`,
          price: sql`${data.price ?? collectionCardTable.price}`,
        },
      })
      .returning();

    await updateCollectionUpdatedAt(paramCollectionId);
    return c.json({ data: newCollectionCard[0] }, 201);
  },
);

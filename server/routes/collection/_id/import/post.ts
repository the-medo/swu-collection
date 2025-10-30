import { Hono } from 'hono';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { zCollectionImportRequest } from '../../../../../types/ZCollectionCard.ts';
import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
import { collection as collectionTable } from '../../../../db/schema/collection.ts';
import { db } from '../../../../db';
import { cardList } from '../../../../db/lists.ts';
import {
  collectionCard as collectionCardTable,
  type InsertCollectionCard,
} from '../../../../db/schema/collection_card.ts';
import { batchArray } from '../../../../lib/utils/batch.ts';
import { updateCollectionUpdatedAt } from '../../../../lib/updateCollectionUpdatedAt.ts';

export const collectionIdImportPostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('json', zCollectionImportRequest),
  async c => {
    const paramCollectionId = z.guid().parse(c.req.param('id'));
    const data = c.req.valid('json');
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const collectionId = eq(collectionTable.id, paramCollectionId);

    const col = (await db.select().from(collectionTable).where(collectionId))[0];
    if (!col) return c.json({ message: "Collection doesn't exist" }, 404);
    if (col.userId !== user.id) return c.json({ message: 'Unauthorized' }, 401);

    // Validate cardId and variantId
    const validCards = [];
    const invalidCards = [];

    for (const card of data.cards) {
      const cardData = cardList[card.cardId];
      if (!cardData) {
        invalidCards.push({ ...card, reason: 'Card ID does not exist' });
        continue;
      }

      const variantData = cardData.variants[card.variantId];
      if (!variantData) {
        invalidCards.push({ ...card, reason: 'Variant ID does not exist for this card' });
        continue;
      }

      validCards.push(card);
    }

    if (invalidCards.length > 0) {
      return c.json(
        {
          message: 'Some cards could not be imported because they do not exist',
          invalidCards,
        },
        400,
      );
    }

    // Prepare cards for insertion with default values
    const cardsToInsert: InsertCollectionCard[] = validCards.map(card => ({
      collectionId: paramCollectionId,
      cardId: card.cardId,
      variantId: card.variantId,
      foil: card.isFoil,
      condition: 1, // Default value
      language: 'EN', // Default value
      note: null, // Default value
      amount: card.count,
      amount2: null, // Default value
      price: null, // Default value
    }));

    const BATCH_SIZE = 2000; // Process in batches of 2000 cards
    const batches = batchArray(cardsToInsert, BATCH_SIZE);

    let allInsertedCards: any[] = [];

    // Process batches in a transaction
    await db.transaction(async tx => {
      for (const batch of batches) {
        const insertedBatch = await tx
          .insert(collectionCardTable)
          .values(batch)
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
              amount: sql`${collectionCardTable.amount} + EXCLUDED.amount`,
            },
          })
          .returning();

        allInsertedCards = [...allInsertedCards, ...insertedBatch];
      }
    });

    const insertedCards = allInsertedCards;

    await updateCollectionUpdatedAt(paramCollectionId);

    return c.json(
      {
        data: {
          inserted: insertedCards.length,
          cards: insertedCards,
        },
      },
      201,
    );
  },
);

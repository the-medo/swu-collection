import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { zCollectionBulkInsertRequest } from '../../../../../types/ZCollectionCard.ts';
import { z } from 'zod';
import { and, eq, lte, sql } from 'drizzle-orm';
import { collection as collectionTable } from '../../../../db/schema/collection.ts';
import { db } from '../../../../db';
import { collectionCard as collectionCardTable } from '../../../../db/schema/collection_card.ts';
import { cardList } from '../../../../db/lists.ts';
import { updateCollectionUpdatedAt } from '../../../../lib/updateCollectionUpdatedAt.ts';
import type { AuthExtension } from '../../../../auth/auth.ts';
import type { InsertCollectionCard } from '../../../../db/schema/collection_card.ts';
import type { SwuRarity, SwuSet } from '../../../../../types/enums.ts';

/**
 * Bulk action with collection (wantlist)
 *    - add to collection
 *    - update amounts in collection
 * - only user's collection
 * */
export const collectionIdBulkPostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('json', zCollectionBulkInsertRequest),
  async c => {
    const paramCollectionId = z.guid().parse(c.req.param('id'));
    const data = c.req.valid('json');
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const collectionId = eq(collectionTable.id, paramCollectionId);

    const col = (await db.select().from(collectionTable).where(collectionId))[0];
    if (!col) return c.json({ message: "Card collection doesn't exist" }, 500);
    if (col.userId !== user.id) return c.json({ message: 'Unauthorized' }, 401);

    const cardCollectionId = eq(collectionCardTable.collectionId, paramCollectionId);

    const wantedRarities = data.rarities.reduce(
      (p, c) => ({ ...p, [c]: true }),
      {} as Record<SwuRarity, true | undefined>,
    );
    const wantedSets = data.sets.reduce(
      (p, c) => ({ ...p, [c]: true }),
      {} as Record<SwuSet, true | undefined>,
    );
    const wantedVariants = data.variants.reduce(
      (p, v) => {
        const spl = v.split(' ');
        const standardOrHyperspace = spl[0];
        let result = p[standardOrHyperspace] ?? { foil: false, nonfoil: false };
        if (spl.length === 1) {
          result.nonfoil = true;
        } else if (spl.length === 2) {
          result.foil = true;
        }
        return { ...p, [standardOrHyperspace]: result };
      },
      {} as Record<string, { foil?: boolean; nonfoil?: boolean } | undefined>,
    );
    const condition = data.condition;
    const language = data.language;
    const note = data.note;
    const amount = data.amount;

    const cardsToInsert: InsertCollectionCard[] = [];
    Object.values(cardList).forEach(c => {
      if (!c || !c.cardId) return;
      if (!wantedRarities[c.rarity]) return;
      Object.values(c.variants).forEach(v => {
        if (!v) return;
        if (!wantedSets[v.set]) return;
        const wantedVariant = wantedVariants[v.variantName];
        if (!wantedVariant) return;

        const baseCollectionCard: Omit<InsertCollectionCard, 'foil'> = {
          collectionId: paramCollectionId,
          cardId: c.cardId,
          variantId: v.variantId,
          condition,
          language,
          amount,
          note: note ?? '',
        };

        if (v.hasFoil && wantedVariant.foil) {
          cardsToInsert.push({
            ...baseCollectionCard,
            foil: true,
          });
        }

        if (v.hasNonfoil && wantedVariant.nonfoil) {
          cardsToInsert.push({
            ...baseCollectionCard,
            foil: false,
          });
        }
      });
    });

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
          amount: sql`${collectionCardTable.amount} + ${data.amount ?? 0}`,
          note: sql`${data.note ?? collectionCardTable.note}`,
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
        amount,
      },
    });
  },
);

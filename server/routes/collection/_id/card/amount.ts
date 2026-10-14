import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { db } from '../../../../db';
import { collection } from '../../../../db/schema/collection.ts';
import { collectionCard } from '../../../../db/schema/collection_card.ts';
import { getMergedCardList } from '../../../../lib/cards/cardListProvider.ts';
import { updateCollectionUpdatedAt } from '../../../../lib/updateCollectionUpdatedAt.ts';
import { zCollectionCardSetAmountRequest } from '../../../../../types/ZCollectionCard.ts';

export const collectionCardAmountPutRoute = new Hono<AuthExtension>()
  .use('*', async (c, next) => {
    if (!c.get('user')) return c.json({ message: 'Unauthorized' }, 401);
    await next();
  })
  .put(
    '/',
    zValidator('param', z.object({ id: z.uuid() })),
    zValidator('json', zCollectionCardSetAmountRequest),
    async c => {
      const collectionId = c.req.valid('param').id;
      const { id, amount } = c.req.valid('json');
      const user = c.get('user')!;
      const cards = await getMergedCardList();
      const card = cards[id.cardId];
      if (card?.cardId !== id.cardId || card.variants[id.variantId]?.variantId !== id.variantId) {
        return c.json({ message: 'Unknown card version.' }, 400);
      }

      const result = await db.transaction(async tx => {
        const [owned] = await tx
          .select({ id: collection.id })
          .from(collection)
          .where(and(eq(collection.id, collectionId), eq(collection.userId, user.id)))
          .for('update');
        if (!owned) return undefined;

        const identity = and(
          eq(collectionCard.collectionId, collectionId),
          eq(collectionCard.cardId, id.cardId),
          eq(collectionCard.variantId, id.variantId),
          eq(collectionCard.foil, id.foil),
          eq(collectionCard.condition, id.condition),
          eq(collectionCard.language, id.language),
        );
        const [existing] = await tx.select().from(collectionCard).where(identity).for('update');
        const empty = { collectionId, ...id, amount: 0, amount2: null, note: null, price: null };
        if (!existing && amount === 0) return empty;
        if (existing?.amount === amount && (amount > 0 || existing.amount2)) return existing;

        let saved;
        if (amount === 0) {
          [saved] = await tx.update(collectionCard).set({ amount }).where(identity).returning();
          if (saved && !saved.amount2) await tx.delete(collectionCard).where(identity);
        } else {
          [saved] = await tx
            .insert(collectionCard)
            .values({ collectionId, ...id, amount })
            .onConflictDoUpdate({
              target: [
                collectionCard.collectionId,
                collectionCard.cardId,
                collectionCard.variantId,
                collectionCard.foil,
                collectionCard.condition,
                collectionCard.language,
              ],
              set: { amount },
            })
            .returning();
        }
        await updateCollectionUpdatedAt(collectionId, tx);
        return saved ?? empty;
      });
      if (!result) return c.json({ message: 'List not found.' }, 404);
      return c.json({ data: result });
    },
  );

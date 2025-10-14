import { Hono } from 'hono';
import { auth, type AuthExtension } from '../../../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../../../../db';
import { collectionCard } from '../../../../db/schema/collection_card.ts';
import { cardVariantPrice } from '../../../../db/schema/card_variant_price.ts';
import { cardVariantPriceHistory } from '../../../../db/schema/card_variant_price_history.ts';
import { cardList } from '../../../../db/lists.ts';
import { and, eq, sql } from 'drizzle-orm';

const zReplaceVariantBody = z.object({
  cardId: z.string(),
  oldVariantId: z.string(),
  newVariantId: z.string(),
});

export const replaceVariantPostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('json', zReplaceVariantBody),
  async c => {
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    // Ensure admin permission
    const hasPermission = await auth.api.userHasPermission({
      body: {
        userId: user.id,
        permission: {
          admin: ['access'],
        },
      },
    });

    if (!hasPermission.success) {
      return c.json({ message: "You don't have permission to access this resource." }, 403);
    }

    try {
      const { cardId, oldVariantId, newVariantId } = c.req.valid('json');

      // Check that the new variant exists in the current cardList for the given cardId
      const card = cardList[cardId];
      if (!card) {
        return c.json({ message: `Card with id ${cardId} not found in cardList.` }, 400);
      }

      const variants = card.variants ?? {};
      const newVariantExists = Object.prototype.hasOwnProperty.call(variants, newVariantId);

      if (!newVariantExists) {
        return c.json(
          { message: `Variant ${newVariantId} does not exist for card ${cardId} (typo or removed).` },
          400,
        );
      }

      // Perform replacements in a single transaction
      const result = await db.transaction(async tx => {
        // collection_card
        const oldRows = await tx
          .select()
          .from(collectionCard)
          .where(and(eq(collectionCard.cardId, cardId), eq(collectionCard.variantId, oldVariantId)));

        let ccMerged = 0;
        for (const row of oldRows) {
          // Try to upsert the new variant row
          await tx
            .insert(collectionCard)
            .values({ ...row, variantId: newVariantId })
            .onConflictDoUpdate({
              target: [
                collectionCard.collectionId,
                collectionCard.cardId,
                collectionCard.variantId,
                collectionCard.foil,
                collectionCard.condition,
                collectionCard.language,
              ],
              set: {
                amount: sql`${collectionCard.amount} + EXCLUDED.amount`,
              },
            });

          // Delete the old variant row
          await tx
            .delete(collectionCard)
            .where(and(eq(collectionCard.cardId, cardId), eq(collectionCard.variantId, oldVariantId)));

          ccMerged++;
        }

        // card_variant_price
        const cvpUpdate = await tx
          .update(cardVariantPrice)
          .set({ variantId: newVariantId })
          .where(
            and(eq(cardVariantPrice.cardId, cardId), eq(cardVariantPrice.variantId, oldVariantId)),
          );

        // card_variant_price_history
        const cvphUpdate = await tx
          .update(cardVariantPriceHistory)
          .set({ variantId: newVariantId })
          .where(
            and(
              eq(cardVariantPriceHistory.cardId, cardId),
              eq(cardVariantPriceHistory.variantId, oldVariantId),
            ),
          );

        return {
          ccMerged,
          cvpUpdated: 'rowCount' in cvpUpdate ? (cvpUpdate as any).rowCount ?? 0 : 0,
          cvphUpdated: 'rowCount' in cvphUpdate ? (cvphUpdate as any).rowCount ?? 0 : 0,
        };
      });

      return c.json(
        {
          message: 'ok',
          data: result,
        },
        200,
      );
    } catch (error) {
      console.error('Error replacing variant:', error);
      return c.json(
        {
          message: 'Failed to replace variant',
          error: error instanceof Error ? error.message : String(error),
        },
        500,
      );
    }
  },
);

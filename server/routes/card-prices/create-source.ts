import { Hono } from 'hono';
import { auth, type AuthExtension } from '../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../../db';
import { cardVariantPrice } from '../../db/schema/card_variant_price.ts';
import { and, eq } from 'drizzle-orm';

// Define request body schema
const createSourceSchema = z.object({
  cardId: z.string().min(1),
  variantId: z.string().min(1),
  sourceType: z.string().min(1),
  sourceLink: z.string().min(1),
  sourceProductId: z.string().optional(),
});

export const cardPricesCreateSourceRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('json', createSourceSchema),
  async c => {
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const hasPermission = await auth.api.userHasPermission({
      body: {
        userId: user.id,
        permission: {
          admin: ['access'],
        },
      },
    });

    if (!hasPermission.success) {
      return c.json({ message: "You don't have permission to modify card price sources." }, 403);
    }

    const { cardId, variantId, sourceType, sourceLink, sourceProductId } = c.req.valid('json');

    // Check if the record already exists
    const existingRecord = await db
      .select()
      .from(cardVariantPrice)
      .where(
        and(
          eq(cardVariantPrice.cardId, cardId),
          eq(cardVariantPrice.variantId, variantId),
          eq(cardVariantPrice.sourceType, sourceType),
        ),
      )
      .limit(1);

    let result = [];

    if (existingRecord.length > 0) {
      // Update the existing record
      result = await db
        .update(cardVariantPrice)
        .set({
          sourceLink,
          sourceProductId,
        })
        .where(
          and(
            eq(cardVariantPrice.cardId, cardId),
            eq(cardVariantPrice.variantId, variantId),
            eq(cardVariantPrice.sourceType, sourceType),
          ),
        )
        .returning();
    } else {
      // Insert a new record
      result = await db
        .insert(cardVariantPrice)
        .values({
          cardId,
          variantId,
          sourceType,
          sourceLink,
          sourceProductId,
          updatedAt: null,
          data: null,
          price: null,
        })
        .returning();
    }

    return c.json({
      success: true,
      data: result[0],
    });
  },
);

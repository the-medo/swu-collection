import { Hono } from 'hono';
import type { AuthExtension } from '../../auth/auth.ts';
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
  sourceLink: z.string().url(),
  data: z.string().min(1), // JSON as string
  price: z.number().positive(),
});

export const cardPricesCreateSourceRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('json', createSourceSchema),
  async c => {
    const { cardId, variantId, sourceType, sourceLink, data, price } = c.req.valid('json');

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

    if (existingRecord.length > 0) {
      // Update the existing record
      await db
        .update(cardVariantPrice)
        .set({
          sourceLink,
          updatedAt: new Date(),
          data,
          price: price.toString(),
        })
        .where(
          and(
            eq(cardVariantPrice.cardId, cardId),
            eq(cardVariantPrice.variantId, variantId),
            eq(cardVariantPrice.sourceType, sourceType),
          ),
        );
    } else {
      // Insert a new record
      await db.insert(cardVariantPrice).values({
        cardId,
        variantId,
        sourceType,
        sourceLink,
        updatedAt: new Date(),
        data,
        price: price.toString(),
      });
    }

    // Return the updated/created record
    const result = await db
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

    return c.json({
      success: true,
      data: result[0],
    });
  },
);

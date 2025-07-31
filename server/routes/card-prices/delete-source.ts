import { Hono } from 'hono';
import type { AuthExtension } from '../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../../db';
import { cardVariantPrice } from '../../db/schema/card_variant_price.ts';
import { and, eq } from 'drizzle-orm';

// Define request parameters schema
const deleteSourceSchema = z.object({
  cardId: z.string().min(1),
  variantId: z.string().min(1),
  sourceType: z.string().min(1),
});

export const cardPricesDeleteSourceRoute = new Hono<AuthExtension>().delete(
  '/',
  zValidator('json', deleteSourceSchema),
  async c => {
    const { cardId, variantId, sourceType } = c.req.valid('json');

    // Check if the record exists
    const existingRecord = await db
      .select()
      .from(cardVariantPrice)
      .where(
        and(
          eq(cardVariantPrice.cardId, cardId),
          eq(cardVariantPrice.variantId, variantId),
          eq(cardVariantPrice.sourceType, sourceType)
        )
      )
      .limit(1);

    if (existingRecord.length === 0) {
      return c.json(
        {
          success: false,
          message: 'Record not found',
        },
        404
      );
    }

    // Delete the record
    await db
      .delete(cardVariantPrice)
      .where(
        and(
          eq(cardVariantPrice.cardId, cardId),
          eq(cardVariantPrice.variantId, variantId),
          eq(cardVariantPrice.sourceType, sourceType)
        )
      );

    return c.json({
      success: true,
      message: 'Record deleted successfully',
    });
  }
);
import { Hono } from 'hono';
import type { AuthExtension } from '../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../../db';
import { cardVariantPrice } from '../../db/schema/card_variant_price.ts';
import { and, eq } from 'drizzle-orm';

// Define query parameters schema
const getSourcesSchema = z.object({
  cardId: z.string().min(1),
  variantId: z.string().min(1),
});

export const cardPricesGetSourcesRoute = new Hono<AuthExtension>().get(
  '/',
  zValidator('query', getSourcesSchema),
  async c => {
    const { cardId, variantId } = c.req.valid('query');

    // Fetch the single record
    const result = await db
      .select()
      .from(cardVariantPrice)
      .where(and(eq(cardVariantPrice.cardId, cardId), eq(cardVariantPrice.variantId, variantId)));

    // Return the record or undefined if not found
    return c.json({
      success: true,
      data: result || undefined,
    });
  },
);

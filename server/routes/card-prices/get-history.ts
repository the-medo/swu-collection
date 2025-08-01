import { Hono } from 'hono';
import type { AuthExtension } from '../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../../db';
import { cardVariantPriceHistory } from '../../db/schema/card_variant_price_history.ts';
import { and, eq, gte } from 'drizzle-orm';

// Define query parameters schema
const getHistorySchema = z.object({
  cardId: z.string().optional(),
  variantId: z.string().optional(),
  sourceType: z.string().optional(),
  days: z.coerce.number().min(1).max(60).default(30),
}).refine(
  (data) => data.cardId || data.variantId,
  {
    message: "At least one of cardId or variantId must be provided",
    path: ["cardId", "variantId"],
  }
);

export const cardPricesGetHistoryRoute = new Hono<AuthExtension>().get(
  '/history',
  zValidator('query', getHistorySchema),
  async c => {
    const { cardId, variantId, sourceType, days } = c.req.valid('query');

    // Calculate the date threshold (days ago from now)
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    // Build dynamic where conditions
    const conditions = [
      gte(cardVariantPriceHistory.createdAt, dateThreshold)
    ];

    if (cardId) {
      conditions.push(eq(cardVariantPriceHistory.cardId, cardId));
    }
    if (variantId) {
      conditions.push(eq(cardVariantPriceHistory.variantId, variantId));
    }
    if (sourceType) {
      conditions.push(eq(cardVariantPriceHistory.sourceType, sourceType));
    }

    // Query the price history
    const result = await db
      .select()
      .from(cardVariantPriceHistory)
      .where(and(...conditions))
      .orderBy(cardVariantPriceHistory.createdAt);

    return c.json({
      success: true,
      data: result,
    });
  },
);
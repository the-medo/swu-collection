import { Hono } from 'hono';
import type { AuthExtension } from '../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../../db';
import { cardVariantPrice } from '../../db/schema/card_variant_price.ts';
import { and, eq, inArray } from 'drizzle-orm';

// Define request body schema for bulk load
const bulkLoadSchema = z.object({
  sourceType: z.string().optional(),
  variantIds: z.array(z.string()).min(1, 'At least one variant ID must be provided'),
});

export const cardPricesBulkLoadRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('json', bulkLoadSchema),
  async c => {
    const { sourceType, variantIds } = c.req.valid('json');

    // Build where conditions
    const conditions = [inArray(cardVariantPrice.variantId, variantIds)];

    // Add sourceType filter if provided
    if (sourceType) {
      conditions.push(eq(cardVariantPrice.sourceType, sourceType));
    }

    // Query with inArray for efficient filtering
    const result = await db
      .select()
      .from(cardVariantPrice)
      .where(and(...conditions));

    return c.json({
      success: true,
      data: result,
    });
  },
);

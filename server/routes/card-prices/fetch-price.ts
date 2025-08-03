import { Hono } from 'hono';
import type { AuthExtension } from '../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../../db';
import { cardVariantPrice } from '../../db/schema/card_variant_price.ts';
import { and, eq, sql } from 'drizzle-orm';
import { parseCardMarketPricing } from '../../lib/card-prices/parse-cardmarket.ts';

// Define request body schema
const fetchPriceSchema = z.object({
  cardId: z.string().min(1),
  variantId: z.string().min(1),
  sourceType: z.string().min(1),
});

export const cardPricesFetchPriceRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('json', fetchPriceSchema),
  async c => {
    const { cardId, variantId, sourceType } = c.req.valid('json');

    try {
      // 1. Fetch existing cardPriceInformation (cardVariantPrice) based on the props
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

      const record = existingRecord[0];
      
      if (!record) {
        return c.json({
          success: false,
          error: 'No existing price record found for the given parameters',
        });
      }

      // 2. If sourceType is 'cardmarket', run parseCardMarketPricing function
      if (sourceType === 'cardmarket') {
        const pricingData = await parseCardMarketPricing(
          cardId,
          variantId,
          sourceType,
          record.sourceLink,
        );

        // 3. Update the cardVariantPrice table
        // Determine price: first listing value, or averagePrice1Day if no listings
        let priceValue = '';
        if (pricingData.topListings && pricingData.topListings.length > 0) {
          priceValue = pricingData.topListings[0].price;
        } else if (pricingData.averagePrice1Day) {
          priceValue = pricingData.averagePrice1Day;
        }

        // Extract numeric value from price string (remove € and convert to number)
        const numericPrice = parseFloat(priceValue.replace(/[€,\s]/g, '').replace(',', '.')) || 0;

        await db
          .update(cardVariantPrice)
          .set({
            updatedAt: sql`NOW()`,
            data: JSON.stringify(pricingData),
            price: numericPrice.toString(),
          })
          .where(
            and(
              eq(cardVariantPrice.cardId, cardId),
              eq(cardVariantPrice.variantId, variantId),
              eq(cardVariantPrice.sourceType, sourceType),
            ),
          );

        return c.json({
          success: true,
          message: 'Price data updated successfully',
          data: pricingData,
        });
      } else {
        return c.json({
          success: false,
          error: 'Only cardmarket sourceType is currently supported',
        });
      }
    } catch (error) {
      console.error('Error fetching price:', error);
      return c.json({
        success: false,
        error: 'Failed to fetch and update price data',
      });
    }
  },
);
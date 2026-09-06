import { zValidator } from '@hono/zod-validator';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { CardPriceSourceType } from '../../../types/CardPrices.ts';
import { SwuSet } from '../../../types/enums.ts';
import type { AuthExtension } from '../../auth/auth.ts';
import { requireAdmin } from '../../auth/requireAdmin.ts';
import { db } from '../../db';
import { cardVariantPrice } from '../../db/schema/card_variant_price.ts';
import { getMergedCardList } from '../../lib/cards/cardListProvider.ts';
import { filterMatchedCardPriceVariantsBySet } from '../../lib/card-prices/matchedVariants.ts';

const querySchema = z.object({
  sourceType: z.enum([CardPriceSourceType.CARDMARKET, CardPriceSourceType.TCGPLAYER]),
  set: z.enum(SwuSet).optional(),
});

export const cardPricesMatchedVariantsRoute = new Hono<AuthExtension>().get(
  '/',
  zValidator('query', querySchema),
  async c => {
    const admin = await requireAdmin(c);
    if (admin.response) return admin.response;

    const { sourceType, set } = c.req.valid('query');
    const rows = await db
      .select({
        cardId: cardVariantPrice.cardId,
        variantId: cardVariantPrice.variantId,
      })
      .from(cardVariantPrice)
      .where(eq(cardVariantPrice.sourceType, sourceType));

    const data = set
      ? filterMatchedCardPriceVariantsBySet(rows, await getMergedCardList(), set)
      : rows;

    return c.json({ data });
  },
);

import { index, numeric, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core';
import type { InferInsertModel } from 'drizzle-orm';

export const cardVariantPrice = pgTable(
  'card_variant_price',
  {
    cardId: text('card_id').notNull(),
    variantId: text('variant_id').notNull(),
    sourceType: text('source_type').notNull(), // 'cardmarket', 'tcgplayer', etc.
    sourceLink: text('source_link').notNull(),
    updatedAt: timestamp('updated_at'),
    data: text('data').notNull(), // JSON as string
    price: numeric('price', { precision: 12, scale: 2 }).notNull(),
  },
  table => {
    return {
      pk: primaryKey({
        name: 'card_variant_price_pk',
        columns: [table.cardId, table.variantId, table.sourceType],
      }),
      cardIdIdx: index('card_variant_price_card_id_idx').on(table.cardId),
      variantIdIdx: index('card_variant_price_variant_id_idx').on(table.variantId),
      sourceTypeIdx: index('card_variant_price_source_type_idx').on(table.sourceType),
      priceIdx: index('card_variant_price_price_idx').on(table.price),
    };
  },
);

export type InsertCardVariantPrice = InferInsertModel<typeof cardVariantPrice>;

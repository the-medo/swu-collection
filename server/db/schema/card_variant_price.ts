import { index, numeric, pgTable, primaryKey, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';

export const cardVariantPrice = pgTable(
  'card_variant_price',
  {
    cardId: text('card_id').notNull(),
    variantId: text('variant_id').notNull(),
    sourceType: text('source_type').notNull(), // 'cardmarket', 'tcgplayer', etc.
    sourceLink: text('source_link').notNull(),
    sourceProductId: varchar('source_product_id'), //mostly numbers, but left as varchar, just in case
    updatedAt: timestamp('updated_at'),
    data: text('data'), // JSON as string
    price: numeric('price', { precision: 12, scale: 2 }),
  },
  table => {
    return {
      pk: primaryKey({
        name: 'card_variant_price_pk',
        columns: [table.cardId, table.variantId, table.sourceType],
      }),
      cardIdIdx: index('cvp_card_id_idx').on(table.cardId),
      variantIdIdx: index('cvp_variant_id_idx').on(table.variantId),
      sourceTypeIdx: index('cvp_source_type_idx').on(table.sourceType),
      sourceProductIdIdx: index('cvp_source_product_id_idx').on(table.sourceProductId),
      priceIdx: index('cvp_price_idx').on(table.price),
    };
  },
);

export type InsertCardVariantPrice = InferInsertModel<typeof cardVariantPrice>;
export type CardVariantPrice = InferSelectModel<typeof cardVariantPrice>;

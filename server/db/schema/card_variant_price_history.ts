import { index, numeric, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core';
import type { InferInsertModel } from 'drizzle-orm';

export const cardVariantPriceHistory = pgTable(
  'card_variant_price_history',
  {
    cardId: text('card_id').notNull(),
    variantId: text('variant_id').notNull(),
    sourceType: text('source_type').notNull(), // 'cardmarket', 'tcgplayer', etc.
    createdAt: timestamp('created_at').notNull().defaultNow(),
    data: text('data').notNull(), // JSON as string
    price: numeric('price', { precision: 12, scale: 2 }).notNull(),
  },
  table => {
    return {
      pk: primaryKey({
        name: 'card_variant_price_history_pk',
        columns: [table.cardId, table.variantId, table.sourceType, table.createdAt],
      }),
      cardIdIdx: index('cvph_card_id_idx').on(table.cardId),
      variantIdIdx: index('cvph_variant_id_idx').on(table.variantId),
      sourceTypeIdx: index('cvph_source_type_idx').on(table.sourceType),
      createdAtIdx: index('cvph_created_at_idx').on(table.sourceType),
      priceIdx: index('cvph_price_idx').on(table.price),
    };
  },
);

export type InsertCardVariantPriceHistory = InferInsertModel<typeof cardVariantPriceHistory>;

import { numeric, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core';
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
    };
  },
);

export type InsertCardVariantPriceHistory = InferInsertModel<typeof cardVariantPriceHistory>;

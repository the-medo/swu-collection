import { index, pgTable, text } from 'drizzle-orm/pg-core';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';

export const cardStandardVariant = pgTable(
  'card_standard_variant',
  {
    cardId: text('card_id').notNull().primaryKey(),
    variantId: text('variant_id').notNull(),
  },
  table => {
    return {
      variantIdIdx: index('csv_variant_id_idx').on(table.variantId),
    };
  },
);

export type InsertCardStandardVariant = InferInsertModel<typeof cardStandardVariant>;
export type CardStandardVariant = InferSelectModel<typeof cardStandardVariant>;

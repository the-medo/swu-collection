import {
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';

// Generic price aggregation per entity (e.g., deck, collection)
export const entityPrice = pgTable(
  'entity_price',
  {
    entityId: uuid('entity_id').notNull(), // deck id, collection id, etc.
    sourceType: text('source_type').notNull(), // e.g. 'cardmarket', 'tcgplayer'
    type: text('type').notNull(), // 'deck' | 'collection' | future types
    updatedAt: timestamp('updated_at'),
    data: text('data'), // JSON as string (same structure as pricing data)
    dataMissing: text('data_missing'), // JSON as string; same keys as data but numeric counts
    price: numeric('price', { precision: 12, scale: 2 }),
    priceMissing: integer('price_missing'), // number of cards without price - sum of quantities from the deck_card
  },
  table => {
    return {
      pk: primaryKey({
        name: 'entity_price_pk',
        columns: [table.entityId, table.sourceType],
      }),
      entityIdIdx: index('ep_entity_id_idx').on(table.entityId),
      typeIdx: index('ep_type_idx').on(table.type),
      sourceTypeIdx: index('ep_source_type_idx').on(table.sourceType),
      priceIdx: index('ep_price_idx').on(table.price),
      updatedAtIdx: index('ep_updated_at_idx').on(table.updatedAt),
    };
  },
);

export type InsertEntityPrice = InferInsertModel<typeof entityPrice>;
export type EntityPrice = InferSelectModel<typeof entityPrice>;

import { boolean, index, integer, numeric, pgTable, primaryKey, text } from 'drizzle-orm/pg-core';
import { collectionTable } from './collection.ts';

export const collectionCardTable = pgTable(
  'collection_card',
  {
    collection_id: text('collection_id')
      .notNull()
      .references(() => collectionTable.id),
    card_id: text('card_id').notNull(),
    variant_id: text('variant_id').notNull(),
    foil: boolean('foil').notNull().default(false),
    condition: integer('condition').notNull().default(1),
    language: text('language'),
    note: text('note'),
    amount: integer('amount').notNull(),
    amount2: integer('amount2'),
    price: numeric('price', { precision: 12, scale: 2 }),
  },
  table => {
    return {
      pk: primaryKey({
        name: 'collection_card_pk',
        columns: [
          table.collection_id,
          table.card_id,
          table.variant_id,
          table.foil,
          table.condition,
          table.language,
        ],
      }),
      cardIdIdx: index('card_id_idx').on(table.card_id),
      variantIdIdx: index('variant_id_idx').on(table.variant_id),
      foilIdx: index('foil_idx').on(table.foil),
      conditionIdx: index('condition_idx').on(table.condition),
      languageIdx: index('language_idx').on(table.language),
    };
  },
);

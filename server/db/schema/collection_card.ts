import {
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  uuid,
} from 'drizzle-orm/pg-core';
import { collection } from './collection.ts';

export const collectionCard = pgTable(
  'collection_card',
  {
    collectionId: uuid('collection_id')
      .notNull()
      .references(() => collection.id),
    cardId: text('card_id').notNull(),
    variantId: text('variant_id').notNull(),
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
          table.collectionId,
          table.cardId,
          table.variantId,
          table.foil,
          table.condition,
          table.language,
        ],
      }),
      cardIdIdx: index('card_id_idx').on(table.cardId),
      variantIdIdx: index('variant_id_idx').on(table.variantId),
      foilIdx: index('foil_idx').on(table.foil),
      conditionIdx: index('condition_idx').on(table.condition),
      languageIdx: index('language_idx').on(table.language),
    };
  },
);

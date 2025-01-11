import { boolean, integer, pgTable, primaryKey, text } from 'drizzle-orm/pg-core';
import { card } from './card.ts';
import { collection } from './collection.ts';
import { set } from './set.ts';

export const collection_card = pgTable(
  'collection_card',
  {
    collection_id: text('collection_id')
      .notNull()
      .references(() => collection.id),
    card_id: integer('card_id')
      .notNull()
      .references(() => card.id),
    set_id: integer('set_id')
      .notNull()
      .references(() => set.id),
    set_number: integer('set_number').notNull(),
    foil: boolean('foil').notNull().default(false),
    special: boolean('special').notNull().default(false),
    amount: integer('amount').notNull(),
    condition: integer('condition').notNull().default(1),
  },
  table => {
    return {
      pk: primaryKey({
        name: 'collection_card_pk',
        columns: [
          table.collection_id,
          table.set_id,
          table.set_number,
          table.foil,
          table.special,
          table.condition,
        ],
      }),
    };
  },
);

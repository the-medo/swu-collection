import { boolean, integer, pgTable } from 'drizzle-orm/pg-core';

export const collection_cards = pgTable('collection_cards', {
  collection_id: integer('collection_id').notNull(),
  card_id: integer('card_id').notNull(),
  set_id: integer('set_id').notNull(),
  set_number: integer('set_number').notNull(),
  foil: boolean('foil').notNull().default(false),
  special: boolean('special').notNull().default(false),
  amount: integer('amount').notNull(),
  condition: integer('condition').notNull().default(1),
});

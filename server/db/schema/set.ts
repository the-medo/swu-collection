import { date, integer, pgTable, serial, varchar } from 'drizzle-orm/pg-core';

export const set = pgTable('set', {
  id: serial('id').primaryKey(),
  name: varchar('name').unique(),
  abbr: varchar('abbr').unique(),
  release_date: date('release_date').notNull(),
  card_count: integer('card_count').notNull(),
});

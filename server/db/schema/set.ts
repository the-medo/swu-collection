import { date, integer, pgTable, serial, varchar } from 'drizzle-orm/pg-core';

export const set = pgTable('set', {
  id: serial('id').primaryKey(),
  name: varchar('name').unique(),
  abbr: varchar('abbr').unique(),
  release_date: date('release_date').notNull(),
  basic_set_size: integer('basic_set_size').notNull(),
  hyperspace_set_size: integer('hyperspace_set_size').notNull(),
});

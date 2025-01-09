import { date, integer, pgTable, varchar } from 'drizzle-orm/pg-core';

export const sets = pgTable('sets', {
  id: integer('id').primaryKey(),
  name: varchar('name').unique(),
  release_date: date('release_date').notNull(),
  basic_set_size: integer('basic_set_size').notNull(),
  hyperspace_set_size: integer('hyperspace_set_size').notNull(),
});

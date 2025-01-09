import { integer, json, pgTable, varchar } from 'drizzle-orm/pg-core';

export const cards = pgTable('cards', {
  id: integer('id').primaryKey(),
  name: varchar('name').unique(),
  definition: json('definition'),
});

import { json, pgTable, serial, varchar } from 'drizzle-orm/pg-core';

export const card = pgTable('card', {
  id: serial('id').primaryKey(),
  name: varchar('name').unique(),
  definition: json('definition'),
});

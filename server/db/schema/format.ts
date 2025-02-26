import { pgTable, serial, varchar } from 'drizzle-orm/pg-core';

export const format = pgTable('format', {
  id: serial('id').primaryKey(),
  name: varchar('name').unique(),
  description: varchar('description'),
});

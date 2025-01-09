import { boolean, integer, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const collections = pgTable('collections', {
  id: integer('id').primaryKey(),
  user_id: uuid('user_id'),
  title: varchar('title').notNull(),
  wantlist: boolean('wantlist').notNull(),
  created_at: timestamp('created_at').notNull().default('now()'),
  updated_at: timestamp('updated_at').notNull().default('now()'),
});

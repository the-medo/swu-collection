import { boolean, pgTable, serial, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { user } from './auth-schema.ts';

export const collection = pgTable('collection', {
  id: serial('id').primaryKey(),
  user_id: text('user_id').references(() => user.id),
  title: varchar('title').notNull(),
  wantlist: boolean('wantlist').notNull(),
  public: boolean('public').notNull().default(false),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
});

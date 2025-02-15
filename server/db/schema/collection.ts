import { boolean, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { user } from './auth-schema.ts';

export const collection = pgTable('collection', {
  id: uuid('id').defaultRandom().notNull().primaryKey(), //text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id),
  title: varchar('title').notNull(),
  description: varchar('description').notNull().default(''),
  wantlist: boolean('wantlist').notNull(),
  public: boolean('public').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

import { pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  username: varchar('username').notNull().unique(),
  hashed_password: varchar('hashed_password').notNull(),
  email: varchar('email').notNull().unique(),
  created_at: timestamp('created_at').notNull().default('now()'),
});

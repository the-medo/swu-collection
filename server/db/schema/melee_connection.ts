import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth-schema.ts';

export const meleeConnection = pgTable('melee_connection', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  meleeUserId: uuid('melee_user_id').notNull().unique(),
  username: text('username').notNull(),
  displayName: text('display_name').notNull(),
  linkedAt: timestamp('linked_at', { withTimezone: true }).notNull().defaultNow(),
});

// Only the owner can read a challenge. It is consumed atomically when linked.
export const meleeVerification = pgTable('melee_verification', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  username: text('username').notNull(),
  code: text('code').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
});

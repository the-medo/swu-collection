import { index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Recipients and action URLs only live inside the authenticated encrypted payload.
// No user FK: signup may still be committing when its email is enqueued.
export const authEmailOutbox = pgTable(
  'auth_email_outbox',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    recipientHash: text('recipient_hash').notNull(),
    kind: text('kind').notNull(),
    payload: text('payload'),
    status: text('status').notNull().default('pending'),
    attempts: integer('attempts').notNull().default(0),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastError: text('last_error'),
  },
  table => [
    index('auth_email_outbox_pending_idx').on(table.status, table.nextAttemptAt),
    index('auth_email_outbox_recipient_idx').on(table.recipientHash, table.createdAt),
  ],
);

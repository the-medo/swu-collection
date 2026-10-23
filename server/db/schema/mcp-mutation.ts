import { jsonb, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth-schema.ts';

// Receipts contain a payload hash and minimal result IDs/revisions, never article
// prose, image bytes, tokens or provider credentials. Retried writes are atomic.
export const mcpMutation = pgTable(
  'mcp_mutation',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    clientId: text('client_id').notNull(),
    requestId: uuid('request_id').notNull(),
    tool: text('tool').notNull(),
    inputHash: text('input_hash').notNull(),
    result: jsonb('result').$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [primaryKey({ columns: [table.userId, table.clientId, table.requestId] })],
);

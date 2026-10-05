import { check, index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { user } from './auth-schema.ts';

// No arguments, card queries, tokens, headers or client-supplied identities.
export const mcpToolUsage = pgTable(
  'mcp_tool_usage',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    clientId: text('client_id').notNull(),
    tool: text('tool').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    outcome: text('outcome').$type<'started' | 'success' | 'error'>().notNull().default('started'),
    resultCount: integer('result_count'),
    durationMs: integer('duration_ms'),
  },
  table => [
    index('mcp_tool_usage_user_started_idx').on(table.userId, table.startedAt),
    index('mcp_tool_usage_started_idx').on(table.startedAt),
    check('mcp_tool_usage_outcome_check', sql`${table.outcome} in ('started', 'success', 'error')`),
    check(
      'mcp_tool_usage_counts_check',
      sql`${table.resultCount} >= 0 and ${table.durationMs} >= 0`,
    ),
  ],
);

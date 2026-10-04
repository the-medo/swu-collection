import { check, index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { user } from './auth-schema.ts';
import { userReport } from './user_report.ts';
import type { ModerationActionInput } from '../../../shared/types/userReportModeration.ts';

export const userReportAction = pgTable(
  'user_report_action',
  {
    id: uuid('id').primaryKey(), // Client request ID makes decisions safe to retry.
    reportId: uuid('report_id')
      .notNull()
      .references(() => userReport.id, { onDelete: 'cascade' }),
    actorUserId: text('actor_user_id').references(() => user.id, { onDelete: 'set null' }),
    actorIdAtAction: text('actor_id_at_action').notNull(),
    actorDisplayName: text('actor_display_name').notNull(),
    targetUserId: text('target_user_id').references(() => user.id, { onDelete: 'set null' }),
    targetIdAtAction: text('target_id_at_action'),
    targetDisplayName: text('target_display_name'),
    target: text('target').$type<'reported' | 'reporter'>().notNull(),
    action: text('action').$type<ModerationActionInput['action']>().notNull(),
    reason: text('reason').notNull(),
    reportRevision: integer('report_revision').notNull(),
    durationDays: integer('duration_days'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [
    index('user_report_action_report_idx').on(table.reportId, table.createdAt),
    index('user_report_action_target_idx').on(table.targetIdAtAction, table.createdAt),
    check(
      'user_report_action_type_check',
      sql`${table.action} IN ('dismiss', 'suspend', 'ban', 'restore', 'reopen')`,
    ),
    check(
      'user_report_action_reason_check',
      sql`char_length(trim(${table.reason})) BETWEEN 1 AND 2000`,
    ),
    check('user_report_action_target_check', sql`${table.target} IN ('reported', 'reporter')`),
    check(
      'user_report_action_duration_check',
      sql`(${table.action} = 'suspend' AND ${table.durationDays} BETWEEN 1 AND 365 AND ${table.expiresAt} IS NOT NULL) OR (${table.action} <> 'suspend' AND ${table.durationDays} IS NULL AND ${table.expiresAt} IS NULL)`,
    ),
  ],
);

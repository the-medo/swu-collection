import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { user } from './auth-schema.ts';

export const userReport = pgTable(
  'user_report',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Keep the report for review if either account is subsequently deleted.
    reporterUserId: text('reporter_user_id').references(() => user.id, { onDelete: 'set null' }),
    reportedUserId: text('reported_user_id').references(() => user.id, { onDelete: 'set null' }),
    // Submission snapshots keep reports identifiable after renames or deletion.
    // Nullable only for reports predating the snapshot migration.
    reporterIdAtSubmission: text('reporter_id_at_submission'),
    reportedIdAtSubmission: text('reported_id_at_submission'),
    reporterDisplayName: text('reporter_display_name'),
    reportedDisplayName: text('reported_display_name'),
    clientReportId: uuid('client_report_id').notNull(),
    description: text('description').notNull(),
    status: text('status').$type<'open' | 'resolved'>().notNull().default('open'),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    revision: integer('revision').notNull().default(0),
    source: text('source').$type<'profile' | 'conversation'>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [
    uniqueIndex('user_report_request_idx').on(table.reporterUserId, table.clientReportId),
    index('user_report_reporter_time_idx').on(table.reporterUserId, table.createdAt),
    index('user_report_target_time_idx').on(table.reportedUserId, table.createdAt),
    index('user_report_status_time_idx').on(table.status, table.createdAt),
    index('user_report_reporter_snapshot_idx').on(table.reporterIdAtSubmission, table.createdAt),
    index('user_report_reported_snapshot_idx').on(table.reportedIdAtSubmission, table.createdAt),
    check('user_report_status_check', sql`${table.status} IN ('open', 'resolved')`),
    check(
      'user_report_resolution_check',
      sql`(${table.status} = 'open' AND ${table.resolvedAt} IS NULL) OR (${table.status} = 'resolved' AND ${table.resolvedAt} IS NOT NULL)`,
    ),
    index('user_report_created_idx').on(table.createdAt),
    check(
      'user_report_description_check',
      sql`char_length(trim(${table.description})) BETWEEN 1 AND 2000`,
    ),
    check('user_report_source_check', sql`${table.source} IN ('profile', 'conversation')`),
    check('user_report_other_user_check', sql`${table.reporterUserId} <> ${table.reportedUserId}`),
  ],
);

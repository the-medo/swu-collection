import { sql } from 'drizzle-orm';
import { check, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth-schema.ts';
import { creation } from './creator_hub.ts';

const date = (name: string) => timestamp(name, { mode: 'string', withTimezone: true });
export const creationReport = pgTable(
  'creation_report',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clientReportId: uuid('client_report_id').notNull().defaultRandom(),
    creationId: uuid('creation_id')
      .notNull()
      .references(() => creation.id, { onDelete: 'cascade' }),
    reporterId: text('reporter_id').references(() => user.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    sourceUrl: text('source_url').notNull(),
    details: text('details').notNull().default(''),
    status: text('status').$type<'open' | 'dismissed' | 'unpublished'>().notNull().default('open'),
    createdAt: date('created_at').notNull().defaultNow(),
    resolvedAt: date('resolved_at'),
    resolvedBy: text('resolved_by').references(() => user.id, { onDelete: 'set null' }),
  },
  t => [
    uniqueIndex('creation_report_reporter_video')
      .on(t.reporterId, t.creationId)
      .where(sql`${t.status} = 'open'`),
    uniqueIndex('creation_report_request').on(t.reporterId, t.clientReportId),
    index('creation_report_queue').on(t.status, t.createdAt),
    index('creation_report_creation').on(t.creationId),
    index('creation_report_reporter_time').on(t.reporterId, t.createdAt),
    check('creation_report_status_check', sql`${t.status} IN ('open', 'dismissed', 'unpublished')`),
    check('creation_report_details_check', sql`char_length(${t.details}) <= 1000`),
    check(
      'creation_report_resolution_check',
      sql`(${t.status} = 'open' AND ${t.resolvedAt} IS NULL) OR (${t.status} <> 'open' AND ${t.resolvedAt} IS NOT NULL)`,
    ),
  ],
);

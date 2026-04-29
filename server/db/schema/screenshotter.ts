import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';

export const screenshotter = pgTable(
  'screenshotter',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    scopeType: varchar('scope_type', { length: 80 }).notNull(),
    scopeId: text('scope_id'),
    scopeKey: text('scope_key').notNull(),
    target: varchar('target', { length: 120 }).notNull(),
    r2Key: text('r2_key').notNull(),
    url: text('url').notNull(),
    contentType: varchar('content_type', { length: 100 }).notNull(),
    byteSize: integer('byte_size'),
    width: integer('width'),
    height: integer('height'),
    sourceUrl: text('source_url'),
    status: varchar('status', { length: 20 }).notNull().default('success'),
    error: text('error'),
    generatedAt: timestamp('generated_at', { mode: 'string' }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow(),
  },
  table => ({
    scopeTargetIdx: uniqueIndex('screenshotter_scope_target_uidx').on(table.scopeKey, table.target),
    scopeIdx: index('screenshotter_scope_idx').on(table.scopeType, table.scopeId),
    scopeKeyIdx: index('screenshotter_scope_key_idx').on(table.scopeKey),
    statusIdx: index('screenshotter_status_idx').on(table.status),
    generatedAtIdx: index('screenshotter_generated_at_idx').on(table.generatedAt),
  }),
);

export type Screenshotter = InferSelectModel<typeof screenshotter>;
export type ScreenshotterInsert = InferInsertModel<typeof screenshotter>;

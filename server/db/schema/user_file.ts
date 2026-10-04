import { bigint, check, index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { user } from './auth-schema.ts';
import { defaultUserFileQuotaBytes } from '../../../types/UserFile.ts';

// Entitlement, not a user-editable preference. Provisioned lazily per account.
export const userFileStorage = pgTable(
  'user_file_storage',
  {
    userId: text('user_id')
      .primaryKey()
      .references(() => user.id, { onDelete: 'cascade' }),
    quotaBytes: bigint('quota_bytes', { mode: 'number' })
      .notNull()
      .default(defaultUserFileQuotaBytes),
  },
  table => [
    check(
      'user_file_storage_quota_check',
      sql`${table.quotaBytes} >= 0 AND ${table.quotaBytes} <= 9007199254740991`,
    ),
  ],
);

export const userFile = pgTable(
  'user_file',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    fileName: text('file_name').notNull(),
    imageKey: text('image_key').notNull(),
    thumbnailKey: text('thumbnail_key').notNull(),
    originalByteSize: integer('original_byte_size').notNull(),
    byteSize: integer('byte_size').notNull(),
    thumbnailByteSize: integer('thumbnail_byte_size').notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    createdAt: timestamp('created_at', { mode: 'string', withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  table => [
    index('user_file_owner_created_idx').on(table.userId, table.createdAt, table.id),
    check('user_file_dimensions_check', sql`${table.width} > 0 AND ${table.height} > 0`),
    check(
      'user_file_sizes_check',
      sql`${table.originalByteSize} > 0 AND ${table.byteSize} > 0 AND ${table.thumbnailByteSize} > 0`,
    ),
  ],
);

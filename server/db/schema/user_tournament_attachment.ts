import {
  pgTable,
  pgEnum,
  text,
  uuid,
  integer,
  timestamp,
  primaryKey,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { user } from './auth-schema.ts';
import { tournament } from './tournament.ts';
import {
  attachmentCategories,
  attachmentKinds,
  preparationStatuses,
} from '../../../types/TournamentAttachment.ts';

export const tournamentAttachmentCategory = pgEnum(
  'tournament_attachment_category',
  attachmentCategories,
);
export const tournamentAttachmentKind = pgEnum('tournament_attachment_kind', attachmentKinds);
export const tournamentPreparationStatus = pgEnum(
  'tournament_preparation_status',
  preparationStatuses,
);
export const userTournamentPreparation = pgTable(
  'user_tournament_preparation',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    tournamentId: uuid('tournament_id')
      .notNull()
      .references(() => tournament.id, { onDelete: 'cascade' }),
    category: tournamentAttachmentCategory('category').notNull(),
    status: tournamentPreparationStatus('status').notNull().default('no'),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow(),
  },
  table => [
    primaryKey({ columns: [table.userId, table.tournamentId, table.category] }),
    index('user_tournament_preparation_tournament_idx').on(table.tournamentId),
  ],
);
export const userTournamentAttachment = pgTable(
  'user_tournament_attachment',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    tournamentId: uuid('tournament_id')
      .notNull()
      .references(() => tournament.id, { onDelete: 'cascade' }),
    category: tournamentAttachmentCategory('category').notNull(),
    kind: tournamentAttachmentKind('kind').notNull(),
    title: text('title').notNull(),
    content: text('content'),
    objectKey: text('object_key'),
    fileName: text('file_name'),
    mimeType: text('mime_type'),
    byteSize: integer('byte_size'),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow(),
  },
  table => [
    index('user_tournament_attachment_owner_idx').on(table.userId, table.tournamentId),
    index('user_tournament_attachment_tournament_idx').on(table.tournamentId),
    check(
      'user_tournament_attachment_payload_check',
      sql`(
    (${table.kind} = 'file' AND ${table.objectKey} IS NOT NULL AND ${table.fileName} IS NOT NULL AND ${table.mimeType} IS NOT NULL AND ${table.byteSize} IS NOT NULL AND ${table.byteSize} > 0 AND ${table.content} IS NULL)
    OR (${table.kind} IN ('text', 'link') AND ${table.content} IS NOT NULL AND ${table.objectKey} IS NULL AND ${table.fileName} IS NULL AND ${table.mimeType} IS NULL AND ${table.byteSize} IS NULL)
  )`,
    ),
  ],
);

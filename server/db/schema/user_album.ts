import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { user } from './auth-schema.ts';
import { tournament } from './tournament.ts';
import { userFile } from './user_file.ts';
import type { AlbumVisibility } from '../../../types/UserAlbum.ts';

export const userAlbum = pgTable(
  'user_album',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    visibility: text('visibility').$type<AlbumVisibility>().notNull().default('unlisted'),
    coverFileId: uuid('cover_file_id').references(() => userFile.id, { onDelete: 'set null' }),
    tournamentId: uuid('tournament_id').references(() => tournament.id, { onDelete: 'set null' }),
    revision: integer('revision').notNull().default(0),
    createdAt: timestamp('created_at', { mode: 'string', withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string', withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  table => [
    index('user_album_owner_created_idx').on(table.userId, table.createdAt, table.id),
    index('user_album_public_created_idx')
      .on(table.userId, table.createdAt, table.id)
      .where(sql`${table.visibility} = 'public'`),
    index('user_album_tournament_created_idx')
      .on(table.tournamentId, table.createdAt, table.id)
      .where(sql`${table.tournamentId} IS NOT NULL AND ${table.visibility} = 'public'`),
    check(
      'user_album_tournament_public_check',
      sql`${table.tournamentId} IS NULL OR ${table.visibility} = 'public'`,
    ),
    index('user_album_cover_idx').on(table.coverFileId),
    check(
      'user_album_visibility_check',
      sql`${table.visibility} IN ('private', 'unlisted', 'public')`,
    ),
    check('user_album_title_check', sql`length(btrim(${table.title})) BETWEEN 1 AND 120`),
    check('user_album_description_check', sql`length(${table.description}) <= 2000`),
    check('user_album_revision_check', sql`${table.revision} >= 0`),
  ],
);

export const userAlbumItem = pgTable(
  'user_album_item',
  {
    albumId: uuid('album_id')
      .notNull()
      .references(() => userAlbum.id, { onDelete: 'cascade' }),
    fileId: uuid('file_id')
      .notNull()
      .references(() => userFile.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    caption: text('caption').notNull().default(''),
    altText: text('alt_text').notNull().default(''),
  },
  table => [
    primaryKey({ columns: [table.albumId, table.fileId] }),
    index('user_album_item_order_idx').on(table.albumId, table.position, table.fileId),
    index('user_album_item_file_idx').on(table.fileId),
    check('user_album_item_position_check', sql`${table.position} >= 0`),
    check(
      'user_album_item_text_check',
      sql`length(${table.caption}) <= 500 AND length(${table.altText}) <= 300`,
    ),
  ],
);

import {
  foreignKey,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { user } from './auth-schema.ts';
import { deck } from './deck.ts';
import { teamMember } from './team_member.ts';
import { sql } from 'drizzle-orm';
import type { DeckFolderShareAudience } from '../../../types/DeckFolder.ts';

export const deckFolder = pgTable(
  'deck_folder',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    parentId: uuid('parent_id'),
    name: varchar('name', { length: 100 }).notNull(),
    position: integer('position').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => [
    unique('deck_folder_id_user_id_unique').on(table.id, table.userId),
    foreignKey({
      name: 'deck_folder_parent_owner_fk',
      columns: [table.parentId, table.userId],
      foreignColumns: [table.id, table.userId],
    }).onDelete('cascade'),
    index('deck_folder_user_parent_idx').on(table.userId, table.parentId),
  ],
);

// Folder membership is private organisation metadata, separate from public deck DTOs.
export const deckFolderDeck = pgTable(
  'deck_folder_deck',
  {
    deckId: uuid('deck_id')
      .primaryKey()
      .references(() => deck.id, { onDelete: 'cascade' }),
    folderId: uuid('folder_id')
      .notNull()
      .references(() => deckFolder.id, { onDelete: 'cascade' }),
  },
  table => [index('deck_folder_deck_folder_idx').on(table.folderId)],
);

// Separate audience grants allow more sharing audiences without changing folder ownership.
export const deckFolderShare = pgTable(
  'deck_folder_share',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    folderId: uuid('folder_id').notNull(),
    userId: text('user_id').notNull(),
    audience: varchar('audience', { length: 20 }).$type<DeckFolderShareAudience>().notNull(),
    teamId: uuid('team_id'),
  },
  table => [
    foreignKey({
      name: 'deck_folder_share_owner_fk',
      columns: [table.folderId, table.userId],
      foreignColumns: [deckFolder.id, deckFolder.userId],
    }).onDelete('cascade'),
    // Leaving a team automatically removes the owner's grants to that team.
    foreignKey({
      name: 'deck_folder_share_team_member_fk',
      columns: [table.teamId, table.userId],
      foreignColumns: [teamMember.teamId, teamMember.userId],
    }).onDelete('cascade'),
    check(
      'deck_folder_share_audience_check',
      sql`
      (${table.audience} = 'link' AND ${table.teamId} IS NULL)
      OR (${table.audience} = 'team' AND ${table.teamId} IS NOT NULL)
    `,
    ),
    uniqueIndex('deck_folder_share_link_unique')
      .on(table.folderId)
      .where(sql`${table.audience} = 'link'`),
    uniqueIndex('deck_folder_share_team_unique')
      .on(table.folderId, table.teamId)
      .where(sql`${table.audience} = 'team'`),
    index('deck_folder_share_owner_idx').on(table.userId),
    index('deck_folder_share_team_member_idx').on(table.teamId, table.userId),
  ],
);

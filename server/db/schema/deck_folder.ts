import {
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { user } from './auth-schema.ts';
import { deck } from './deck.ts';

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

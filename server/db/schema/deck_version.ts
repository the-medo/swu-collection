import { sql } from 'drizzle-orm';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { user } from './auth-schema.ts';
import { deck } from './deck.ts';
import { format } from './format.ts';

export const deckVersion = pgTable(
  'deck_version',
  {
    id: uuid('id').defaultRandom().notNull().primaryKey(),
    deckId: uuid('deck_id')
      .notNull()
      .references(() => deck.id, { onDelete: 'cascade' }),
    versionNumber: integer('version_number').notNull(),
    sealedByUserId: text('sealed_by_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    name: varchar('name'),
    description: varchar('description'),
    format: integer('format').references(() => format.id),
    leaderCardId1: varchar('leader_card_id_1'),
    leaderCardId2: varchar('leader_card_id_2'),
    baseCardId: varchar('base_card_id'),
    changeNote: varchar('change_note'),
    contentHash: varchar('content_hash'),
    sourceDeckUpdatedAt: timestamp('source_deck_updated_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    sealedAt: timestamp('sealed_at'),
  },
  table => ({
    deckVersionNumberUnique: uniqueIndex('dv_deck_no_uidx').on(table.deckId, table.versionNumber),
    openHeadUnique: uniqueIndex('dv_open_uidx')
      .on(table.deckId)
      .where(sql`${table.sealedAt} IS NULL`),
    sealedByUserIdIdx: index('dv_sealer_idx').on(table.sealedByUserId),
    versionNumberCheck: check('dv_no_check', sql`${table.versionNumber} > 0`),
  }),
);

export const deckVersionCard = pgTable(
  'deck_version_card',
  {
    deckVersionId: uuid('deck_version_id')
      .notNull()
      .references(() => deckVersion.id, { onDelete: 'cascade' }),
    cardId: varchar('card_id').notNull(),
    board: integer('board').notNull(),
    note: varchar('note').notNull().default(''),
    quantity: integer('quantity').notNull(),
  },
  table => ({
    pk: primaryKey({
      name: 'deck_version_card-pk',
      columns: [table.deckVersionId, table.cardId, table.board],
    }),
    cardIdIdx: index('dvc_card_idx').on(table.cardId),
    boardCheck: check('dvc_board_check', sql`${table.board} IN (1, 2)`),
    quantityCheck: check('dvc_quantity_check', sql`${table.quantity} >= 0`),
  }),
);

export type DeckVersion = InferSelectModel<typeof deckVersion>;
export type NewDeckVersion = InferInsertModel<typeof deckVersion>;
export type DeckVersionCard = InferSelectModel<typeof deckVersionCard>;
export type NewDeckVersionCard = InferInsertModel<typeof deckVersionCard>;

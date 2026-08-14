import { index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import type { InferSelectModel } from 'drizzle-orm';
import { team } from './team.ts';
import { deck } from './deck.ts';
import { user } from './auth-schema.ts';
import { deckBranch } from './deck_branch.ts';

export const deckChangeRequestStatusEnum = pgEnum('deck_change_request_status', [
  'open',
  'merged',
  'closed',
]);

export const deckChangeRequest = pgTable(
  'deck_change_request',
  {
    id: uuid('id').defaultRandom().notNull().primaryKey(),
    teamId: uuid('team_id')
      .notNull()
      .references(() => team.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => deckBranch.id, { onDelete: 'cascade' }),
    baseDeckId: uuid('base_deck_id')
      .notNull()
      .references(() => deck.id, { onDelete: 'cascade' }),
    branchDeckId: uuid('branch_deck_id')
      .notNull()
      .references(() => deck.id, { onDelete: 'cascade' }),
    authorUserId: text('author_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    status: deckChangeRequestStatusEnum('status').notNull().default('open'),
    mergedByUserId: text('merged_by_user_id').references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow(),
    mergedAt: timestamp('merged_at', { mode: 'string' }),
    closedAt: timestamp('closed_at', { mode: 'string' }),
  },
  table => ({
    teamIdIdx: index('deck_change_request-team_id_idx').on(table.teamId),
    branchIdIdx: index('deck_change_request-branch_id_idx').on(table.branchId),
    baseDeckIdIdx: index('deck_change_request-base_deck_id_idx').on(table.baseDeckId),
    branchDeckIdIdx: index('deck_change_request-branch_deck_id_idx').on(table.branchDeckId),
    authorUserIdIdx: index('deck_change_request-author_user_id_idx').on(table.authorUserId),
    statusIdx: index('deck_change_request-status_idx').on(table.status),
  }),
);

export type DeckChangeRequest = InferSelectModel<typeof deckChangeRequest>;


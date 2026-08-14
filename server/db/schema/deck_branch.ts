import { index, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import type { InferSelectModel } from 'drizzle-orm';
import { team } from './team.ts';
import { deck } from './deck.ts';
import { user } from './auth-schema.ts';
import type { DeckSnapshot } from '../../lib/decks/deckBranchSnapshot.ts';

export const deckBranchStatusEnum = pgEnum('deck_branch_status', ['open', 'merged', 'closed']);

export const deckBranch = pgTable(
  'deck_branch',
  {
    id: uuid('id').defaultRandom().notNull().primaryKey(),
    teamId: uuid('team_id')
      .notNull()
      .references(() => team.id, { onDelete: 'cascade' }),
    baseDeckId: uuid('base_deck_id')
      .notNull()
      .references(() => deck.id, { onDelete: 'cascade' }),
    branchDeckId: uuid('branch_deck_id')
      .notNull()
      .references(() => deck.id, { onDelete: 'cascade' })
      .unique(),
    creatorUserId: text('creator_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    baseSnapshot: jsonb('base_snapshot').$type<DeckSnapshot>().notNull(),
    status: deckBranchStatusEnum('status').notNull().default('open'),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow(),
  },
  table => ({
    teamIdIdx: index('deck_branch-team_id_idx').on(table.teamId),
    baseDeckIdIdx: index('deck_branch-base_deck_id_idx').on(table.baseDeckId),
    branchDeckIdIdx: index('deck_branch-branch_deck_id_idx').on(table.branchDeckId),
    creatorUserIdIdx: index('deck_branch-creator_user_id_idx').on(table.creatorUserId),
    statusIdx: index('deck_branch-status_idx').on(table.status),
  }),
);

export type DeckBranch = InferSelectModel<typeof deckBranch>;


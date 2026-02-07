// game-results-schema.ts
import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  jsonb,
  smallint,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { user } from './auth-schema.ts';
import { deck } from './deck.ts';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';

export const userEvent = pgTable(
  'user_event',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    date: timestamp('date', { mode: 'string' }),
    meleeId: text('melee_id'),
    deckId: uuid('deck_id').references(() => deck.id, { onDelete: 'set null' }),
    leaderCardId: text('leader_card_id'),
    baseCardKey: text('base_card_key'),
    note: text('note'),
    gameUpdatedAt: timestamp('game_updated_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    idxUserEventUserDate: index('idx_user_event_user_date').on(table.userId, table.date),
    idxUserEventUserUpdatedAt: index('idx_user_event_user_updated_at').on(
      table.userId,
      table.updatedAt,
    ),
  }),
);

export const gameResult = pgTable(
  'game_result',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    deckId: uuid('deck_id').references(() => deck.id, { onDelete: 'set null' }),
    matchId: text('match_id'), // Karabast lobby_id OR generated OR null
    gameId: text('game_id').notNull(), // Karabast gameId OR generated uuid/string for manual
    gameNumber: smallint('game_number'), // 1|2|3 (nullable for manual / unknown)
    format: text('format'),
    leaderCardId: text('leader_card_id'),
    baseCardKey: text('base_card_key'),
    opponentLeaderCardId: text('opponent_leader_card_id'),
    opponentBaseCardKey: text('opponent_base_card_key'),
    hasInitiative: boolean('has_initiative'),
    hasMulligan: boolean('has_mulligan'),
    isWinner: boolean('is_winner'),
    containsUnknownCards: boolean('contains_unknown_cards').notNull().default(false),
    exclude: boolean('exclude').notNull().default(false), // exclude this game from stats
    gameSource: text('game_source').notNull(), // 'karabast' | 'manual' (extend later if needed)
    manuallyEdited: boolean('manually_edited').notNull().default(false),

    // user grouping
    userEventId: uuid('user_event_id'), // FK added below once userEvent is defined (circular-safe if same file)
    note: text('note'),

    // metrics / extra payload
    cardMetrics: jsonb('card_metrics').notNull().default({}),
    roundMetrics: jsonb('round_metrics').notNull().default({}),
    otherData: jsonb('other_data').notNull().default({}),

    createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow(),
  },
  table => ({
    // fetch newest updates for a user
    idxGameResultsUserUpdatedAt: index('idx_game_result_user_updated_at').on(
      table.userId,
      table.updatedAt,
    ),
    idxGameResultsUserCreatedAt: index('idx_game_result_user_created_at').on(
      table.userId,
      table.createdAt,
    ),
    idxGameResultsUserMatch: index('idx_game_result_user_match').on(table.userId, table.matchId),
    idxGameResultsUserDeck: index('idx_game_result_user_deck').on(table.userId, table.deckId),
    userGameIdUnique: unique().on(table.userId, table.gameId),
  }),
);

export type GameResultDeckInfo = {
  name?: string;
  cardPoolId?: string | null;
  formatId?: number; //this is swubase format id
};

export type GameResultOtherData = {
  roundNumber?: number;
  startedAt?: string;
  finishedAt?: string;
  opponentName?: string;
  deckInfo?: GameResultDeckInfo;
};

export type UserEvent = InferSelectModel<typeof userEvent>;
export type GameResult = InferInsertModel<typeof gameResult> & {
  otherData: GameResultOtherData;
};

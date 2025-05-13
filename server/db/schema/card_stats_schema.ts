import { pgTable, varchar, integer, primaryKey, index, uuid } from 'drizzle-orm/pg-core';
import { meta } from './meta.ts';
import { tournament } from './tournament.ts';
import { type InferSelectModel } from 'drizzle-orm';

// Card Statistics for Meta
export const cardStatMeta = pgTable(
  'card_stat_meta',
  {
    metaId: integer('meta_id')
      .notNull()
      .references(() => meta.id),
    cardId: varchar('card_id').notNull(),
    countMd: integer('count_md').notNull().default(0),
    countSb: integer('count_sb').notNull().default(0),
    deckCount: integer('deck_count').notNull().default(0),
    matchWin: integer('match_win').notNull().default(0),
    matchLose: integer('match_lose').notNull().default(0),
  },
  table => {
    return {
      pk: primaryKey({ columns: [table.metaId, table.cardId] }),
      metaIdIdx: index('csm-meta_id_idx').on(table.metaId),
      cardIdIdx: index('csm-card_id_idx').on(table.cardId),
    };
  },
);

// Card Statistics for Meta by Leader
export const cardStatMetaLeader = pgTable(
  'card_stat_meta_leader',
  {
    metaId: integer('meta_id')
      .notNull()
      .references(() => meta.id),
    leaderCardId: varchar('leader_card_id').notNull(),
    cardId: varchar('card_id').notNull(),
    countMd: integer('count_md').notNull().default(0),
    countSb: integer('count_sb').notNull().default(0),
    deckCount: integer('deck_count').notNull().default(0),
    matchWin: integer('match_win').notNull().default(0),
    matchLose: integer('match_lose').notNull().default(0),
  },
  table => {
    return {
      pk: primaryKey({ columns: [table.metaId, table.leaderCardId, table.cardId] }),
      metaIdIdx: index('csml-meta_id_idx').on(table.metaId),
      leaderCardIdIdx: index('csml-leader_card_id_idx').on(table.leaderCardId),
      cardIdIdx: index('csml-card_id_idx').on(table.cardId),
    };
  },
);

// Card Statistics for Meta by Leader and Base
export const cardStatMetaLeaderBase = pgTable(
  'card_stat_meta_leader_base',
  {
    metaId: integer('meta_id')
      .notNull()
      .references(() => meta.id),
    leaderCardId: varchar('leader_card_id').notNull(),
    baseCardId: varchar('base_card_id').notNull(),
    cardId: varchar('card_id').notNull(),
    countMd: integer('count_md').notNull().default(0),
    countSb: integer('count_sb').notNull().default(0),
    deckCount: integer('deck_count').notNull().default(0),
    matchWin: integer('match_win').notNull().default(0),
    matchLose: integer('match_lose').notNull().default(0),
  },
  table => {
    return {
      pk: primaryKey({
        columns: [table.metaId, table.leaderCardId, table.baseCardId, table.cardId],
      }),
      metaIdIdx: index('csmlb-meta_id_idx').on(table.metaId),
      leaderCardIdIdx: index('csmlb-leader_card_id_idx').on(table.leaderCardId),
      baseCardIdIdx: index('csmlb-base_card_id_idx').on(table.baseCardId),
      cardIdIdx: index('csmlb-card_id_idx').on(table.cardId),
    };
  },
);

// Card Statistics for Tournament
export const cardStatTournament = pgTable(
  'card_stat_tournament',
  {
    tournamentId: uuid('tournament_id')
      .notNull()
      .references(() => tournament.id),
    cardId: varchar('card_id').notNull(),
    countMd: integer('count_md').notNull().default(0),
    countSb: integer('count_sb').notNull().default(0),
    deckCount: integer('deck_count').notNull().default(0),
    matchWin: integer('match_win').notNull().default(0),
    matchLose: integer('match_lose').notNull().default(0),
  },
  table => {
    return {
      pk: primaryKey({ columns: [table.tournamentId, table.cardId] }),
      tournamentIdIdx: index('cst-tournament_id_idx').on(table.tournamentId),
      cardIdIdx: index('cst-card_id_idx').on(table.cardId),
    };
  },
);

// Card Statistics for Tournament by Leader
export const cardStatTournamentLeader = pgTable(
  'card_stat_tournament_leader',
  {
    tournamentId: uuid('tournament_id')
      .notNull()
      .references(() => tournament.id),
    leaderCardId: varchar('leader_card_id').notNull(),
    cardId: varchar('card_id').notNull(),
    countMd: integer('count_md').notNull().default(0),
    countSb: integer('count_sb').notNull().default(0),
    deckCount: integer('deck_count').notNull().default(0),
    matchWin: integer('match_win').notNull().default(0),
    matchLose: integer('match_lose').notNull().default(0),
  },
  table => {
    return {
      pk: primaryKey({ columns: [table.tournamentId, table.leaderCardId, table.cardId] }),
      tournamentIdIdx: index('cstl-tournament_id_idx').on(table.tournamentId),
      leaderCardIdIdx: index('cstl-leader_card_id_idx').on(table.leaderCardId),
      cardIdIdx: index('cstl-card_id_idx').on(table.cardId),
    };
  },
);

// Card Statistics for Tournament by Leader and Base
export const cardStatTournamentLeaderBase = pgTable(
  'card_stat_tournament_leader_base',
  {
    tournamentId: uuid('tournament_id')
      .notNull()
      .references(() => tournament.id),
    leaderCardId: varchar('leader_card_id').notNull(),
    baseCardId: varchar('base_card_id').notNull(),
    cardId: varchar('card_id').notNull(),
    countMd: integer('count_md').notNull().default(0),
    countSb: integer('count_sb').notNull().default(0),
    deckCount: integer('deck_count').notNull().default(0),
    matchWin: integer('match_win').notNull().default(0),
    matchLose: integer('match_lose').notNull().default(0),
  },
  table => {
    return {
      pk: primaryKey({
        columns: [table.tournamentId, table.leaderCardId, table.baseCardId, table.cardId],
      }),
      tournamentIdIdx: index('cstlb-tournament_id_idx').on(table.tournamentId),
      leaderCardIdIdx: index('cstlb-leader_card_id_idx').on(table.leaderCardId),
      baseCardIdIdx: index('cstlb-base_card_id_idx').on(table.baseCardId),
      cardIdIdx: index('cstlb-card_id_idx').on(table.cardId),
    };
  },
);

// Export types
export type CardStatMeta = InferSelectModel<typeof cardStatMeta>;
export type CardStatMetaLeader = InferSelectModel<typeof cardStatMetaLeader>;
export type CardStatMetaLeaderBase = InferSelectModel<typeof cardStatMetaLeaderBase>;
export type CardStatTournament = InferSelectModel<typeof cardStatTournament>;
export type CardStatTournamentLeader = InferSelectModel<typeof cardStatTournamentLeader>;
export type CardStatTournamentLeaderBase = InferSelectModel<typeof cardStatTournamentLeaderBase>;

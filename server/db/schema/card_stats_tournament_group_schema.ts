import {
  pgTable,
  varchar,
  integer,
  primaryKey,
  index,
  uuid,
  foreignKey,
} from 'drizzle-orm/pg-core';
import { tournamentGroup } from './tournament_group.ts';
import { type InferSelectModel } from 'drizzle-orm';

// Card Statistics for Tournament Group
export const cardStatTournamentGroup = pgTable(
  'card_stat_tournament_group',
  {
    tournamentGroupId: uuid('tournament_group_id').notNull(),
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
        name: 'cstg-pk',
        columns: [table.tournamentGroupId, table.cardId],
      }),
      tournamentGroupIdIdx: index('cstg-tournament_group_id_idx').on(table.tournamentGroupId),
      cardIdIdx: index('cstg-card_id_idx').on(table.cardId),
      fk: foreignKey({
        name: 'cstg_tournament_group_fk',
        columns: [table.tournamentGroupId],
        foreignColumns: [tournamentGroup.id],
      }).onDelete('cascade'),
    };
  },
);

// Card Statistics for Tournament Group by Leader
export const cardStatTournamentGroupLeader = pgTable(
  'card_stat_tournament_group_leader',
  {
    tournamentGroupId: uuid('tournament_group_id').notNull(),
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
      pk: primaryKey({
        name: 'cstgl-pk',
        columns: [table.tournamentGroupId, table.leaderCardId, table.cardId],
      }),
      tournamentGroupIdIdx: index('cstgl-tournament_group_id_idx').on(table.tournamentGroupId),
      leaderCardIdIdx: index('cstgl-leader_card_id_idx').on(table.leaderCardId),
      cardIdIdx: index('cstgl-card_id_idx').on(table.cardId),
      fk: foreignKey({
        name: 'cstgl_tournament_group_fk',
        columns: [table.tournamentGroupId],
        foreignColumns: [tournamentGroup.id],
      }).onDelete('cascade'),
    };
  },
);

// Card Statistics for Tournament Group by Leader and Base
export const cardStatTournamentGroupLeaderBase = pgTable(
  'card_stat_tournament_group_leader_base',
  {
    tournamentGroupId: uuid('tournament_group_id').notNull(),
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
        name: 'cstglb-pk',
        columns: [table.tournamentGroupId, table.leaderCardId, table.baseCardId, table.cardId],
      }),
      tournamentGroupIdIdx: index('cstglb-tournament_group_id_idx').on(table.tournamentGroupId),
      leaderCardIdIdx: index('cstglb-leader_card_id_idx').on(table.leaderCardId),
      baseCardIdIdx: index('cstglb-base_card_id_idx').on(table.baseCardId),
      cardIdIdx: index('cstglb-card_id_idx').on(table.cardId),
      fk: foreignKey({
        name: 'cstglb_tournament_group_fk',
        columns: [table.tournamentGroupId],
        foreignColumns: [tournamentGroup.id],
      }).onDelete('cascade'),
    };
  },
);

// Export types
export type CardStatTournamentGroup = InferSelectModel<typeof cardStatTournamentGroup>;
export type CardStatTournamentGroupLeader = InferSelectModel<typeof cardStatTournamentGroupLeader>;
export type CardStatTournamentGroupLeaderBase = InferSelectModel<
  typeof cardStatTournamentGroupLeaderBase
>;

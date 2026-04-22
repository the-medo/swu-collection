import { relations, sql } from 'drizzle-orm';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import {
  boolean,
  date,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { user } from './auth-schema.ts';
import { format } from './format.ts';
import { meta } from './meta.ts';
import { tournament } from './tournament.ts';
import { tournamentGroup } from './tournament_group.ts';

export const tournamentWeekendTournamentStatusEnum = pgEnum(
  'tournament_weekend_tournament_status',
  ['upcoming', 'running', 'finished', 'unknown'],
);

export const tournamentImportStatusEnum = pgEnum('tournament_import_status', [
  'pending',
  'running',
  'finished',
  'failed',
]);

export const tournamentWeekend = pgTable(
  'tournament_weekend',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    date: date('date', { mode: 'string' }).notNull(),
    isLive: boolean('is_live').notNull().default(false),
    tournamentsUpcoming: integer('tournaments_upcoming').notNull().default(0),
    tournamentsRunning: integer('tournaments_running').notNull().default(0),
    tournamentsFinished: integer('tournaments_finished').notNull().default(0),
    tournamentsUnknown: integer('tournaments_unknown').notNull().default(0),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow(),
  },
  table => ({
    dateIdx: index('tw_date_idx').on(table.date),
    liveIdx: index('tw_live_idx').on(table.isLive),
    oneLiveIdx: uniqueIndex('tw_one_live_uidx')
      .on(table.isLive)
      .where(sql`${table.isLive} = true`),
  }),
);

export const tournamentWeekendTournamentGroup = pgTable(
  'tournament_weekend_tournament_group',
  {
    tournamentWeekendId: uuid('tournament_weekend_id').notNull(),
    tournamentGroupId: uuid('tournament_group_id').notNull(),
    formatId: integer('format_id'),
    metaId: integer('meta_id'),
  },
  table => ({
    pk: primaryKey({
      name: 'twtg_pk',
      columns: [table.tournamentWeekendId, table.tournamentGroupId],
    }),
    weekendIdx: index('twtg_weekend_idx').on(table.tournamentWeekendId),
    groupIdx: index('twtg_group_idx').on(table.tournamentGroupId),
    formatIdx: index('twtg_format_idx').on(table.formatId),
    metaIdx: index('twtg_meta_idx').on(table.metaId),
    weekendFk: foreignKey({
      name: 'twtg_weekend_fk',
      columns: [table.tournamentWeekendId],
      foreignColumns: [tournamentWeekend.id],
    }).onDelete('cascade'),
    groupFk: foreignKey({
      name: 'twtg_group_fk',
      columns: [table.tournamentGroupId],
      foreignColumns: [tournamentGroup.id],
    }).onDelete('cascade'),
    formatFk: foreignKey({
      name: 'twtg_format_fk',
      columns: [table.formatId],
      foreignColumns: [format.id],
    }).onDelete('set null'),
    metaFk: foreignKey({
      name: 'twtg_meta_fk',
      columns: [table.metaId],
      foreignColumns: [meta.id],
    }).onDelete('set null'),
  }),
);

export const tournamentWeekendTournament = pgTable(
  'tournament_weekend_tournament',
  {
    tournamentWeekendId: uuid('tournament_weekend_id').notNull(),
    tournamentId: uuid('tournament_id').notNull(),
    status: tournamentWeekendTournamentStatusEnum('status').notNull().default('unknown'),
    hasDecklists: boolean('has_decklists').notNull().default(false),
    additionalData: text('additional_data'),
    roundNumber: integer('round_number'),
    roundName: varchar('round_name', { length: 255 }),
    matchesTotal: integer('matches_total'),
    matchesRemaining: integer('matches_remaining'),
    exactStart: timestamp('exact_start', { mode: 'string' }),
    lastUpdatedAt: timestamp('last_updated_at', { mode: 'string' }),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow(),
  },
  table => ({
    pk: primaryKey({
      name: 'twt_pk',
      columns: [table.tournamentWeekendId, table.tournamentId],
    }),
    weekendIdx: index('twt_weekend_idx').on(table.tournamentWeekendId),
    tournamentIdx: index('twt_tournament_idx').on(table.tournamentId),
    statusIdx: index('twt_status_idx').on(table.status),
    updatedIdx: index('twt_updated_idx').on(table.lastUpdatedAt),
    weekendFk: foreignKey({
      name: 'twt_weekend_fk',
      columns: [table.tournamentWeekendId],
      foreignColumns: [tournamentWeekend.id],
    }).onDelete('cascade'),
    tournamentFk: foreignKey({
      name: 'twt_tournament_fk',
      columns: [table.tournamentId],
      foreignColumns: [tournament.id],
    }).onDelete('cascade'),
  }),
);

export const player = pgTable(
  'player',
  {
    displayName: varchar('display_name', { length: 255 }).notNull().primaryKey(),
    userId: text('user_id'),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow(),
  },
  table => ({
    userIdx: index('player_user_idx').on(table.userId),
    userFk: foreignKey({
      name: 'player_user_fk',
      columns: [table.userId],
      foreignColumns: [user.id],
    }).onDelete('set null'),
  }),
);

export const tournamentStanding = pgTable(
  'tournament_standing',
  {
    tournamentId: uuid('tournament_id').notNull(),
    playerDisplayName: varchar('player_display_name', { length: 255 }).notNull(),
    roundNumber: integer('round_number').notNull(),
    rank: integer('rank').notNull(),
    points: integer('points').notNull(),
    gameRecord: varchar('game_record', { length: 20 }).notNull(),
    matchRecord: varchar('match_record', { length: 20 }).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow(),
  },
  table => ({
    pk: primaryKey({
      name: 'ts_pk',
      columns: [table.tournamentId, table.roundNumber, table.playerDisplayName],
    }),
    tournamentRoundIdx: index('ts_tournament_round_idx').on(table.tournamentId, table.roundNumber),
    playerIdx: index('ts_player_idx').on(table.playerDisplayName),
    tournamentFk: foreignKey({
      name: 'ts_tournament_fk',
      columns: [table.tournamentId],
      foreignColumns: [tournament.id],
    }).onDelete('cascade'),
    playerFk: foreignKey({
      name: 'ts_player_fk',
      columns: [table.playerDisplayName],
      foreignColumns: [player.displayName],
    }).onDelete('cascade'),
  }),
);

export const tournamentWeekendMatch = pgTable(
  'tournament_weekend_match',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tournamentId: uuid('tournament_id').notNull(),
    roundNumber: integer('round_number').notNull(),
    matchKey: varchar('match_key', { length: 255 }).notNull(),
    playerDisplayName1: varchar('player_display_name_1', { length: 255 }).notNull(),
    playerDisplayName2: varchar('player_display_name_2', { length: 255 }),
    player1GameWin: integer('player_1_game_win'),
    player2GameWin: integer('player_2_game_win'),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }),
  },
  table => ({
    tournamentRoundIdx: index('twm_tournament_round_idx').on(table.tournamentId, table.roundNumber),
    matchKeyIdx: uniqueIndex('twm_match_key_uidx').on(
      table.tournamentId,
      table.roundNumber,
      table.matchKey,
    ),
    player1Idx: index('twm_player1_idx').on(table.playerDisplayName1),
    player2Idx: index('twm_player2_idx').on(table.playerDisplayName2),
    tournamentFk: foreignKey({
      name: 'twm_tournament_fk',
      columns: [table.tournamentId],
      foreignColumns: [tournament.id],
    }).onDelete('cascade'),
    player1Fk: foreignKey({
      name: 'twm_player1_fk',
      columns: [table.playerDisplayName1],
      foreignColumns: [player.displayName],
    }).onDelete('cascade'),
    player2Fk: foreignKey({
      name: 'twm_player2_fk',
      columns: [table.playerDisplayName2],
      foreignColumns: [player.displayName],
    }).onDelete('set null'),
  }),
);

export const tournamentWeekendPlayer = pgTable(
  'tournament_weekend_player',
  {
    tournamentId: uuid('tournament_id').notNull(),
    playerDisplayName: varchar('player_display_name', { length: 255 }).notNull(),
    leaderCardId: varchar('leader_card_id', { length: 255 }),
    baseCardKey: varchar('base_card_key', { length: 255 }),
    matchScore: varchar('match_score', { length: 20 }),
    gameScore: varchar('game_score', { length: 20 }),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow(),
  },
  table => ({
    pk: primaryKey({
      name: 'twp_pk',
      columns: [table.tournamentId, table.playerDisplayName],
    }),
    tournamentIdx: index('twp_tournament_idx').on(table.tournamentId),
    playerIdx: index('twp_player_idx').on(table.playerDisplayName),
    leaderBaseIdx: index('twp_leader_base_idx').on(table.leaderCardId, table.baseCardKey),
    tournamentFk: foreignKey({
      name: 'twp_tournament_fk',
      columns: [table.tournamentId],
      foreignColumns: [tournament.id],
    }).onDelete('cascade'),
    playerFk: foreignKey({
      name: 'twp_player_fk',
      columns: [table.playerDisplayName],
      foreignColumns: [player.displayName],
    }).onDelete('cascade'),
  }),
);

export const tournamentWeekendResource = pgTable(
  'tournament_weekend_resource',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tournamentId: uuid('tournament_id').notNull(),
    userId: text('user_id'),
    resourceType: varchar('resource_type', { length: 50 }).notNull(),
    resourceUrl: text('resource_url').notNull(),
    title: varchar('title', { length: 255 }),
    description: text('description'),
    approved: boolean('approved').notNull().default(false),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow(),
  },
  table => ({
    tournamentIdx: index('twr_tournament_idx').on(table.tournamentId),
    userIdx: index('twr_user_idx').on(table.userId),
    approvedIdx: index('twr_approved_idx').on(table.approved),
    typeIdx: index('twr_type_idx').on(table.resourceType),
    resourceIdx: uniqueIndex('twr_resource_uidx').on(
      table.tournamentId,
      table.resourceType,
      table.resourceUrl,
    ),
    tournamentFk: foreignKey({
      name: 'twr_tournament_fk',
      columns: [table.tournamentId],
      foreignColumns: [tournament.id],
    }).onDelete('cascade'),
    userFk: foreignKey({
      name: 'twr_user_fk',
      columns: [table.userId],
      foreignColumns: [user.id],
    }).onDelete('set null'),
  }),
);

export const playerWatch = pgTable(
  'player_watch',
  {
    userId: text('user_id').notNull(),
    playerDisplayName: varchar('player_display_name', { length: 255 }).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
  },
  table => ({
    pk: primaryKey({
      name: 'pw_pk',
      columns: [table.userId, table.playerDisplayName],
    }),
    userIdx: index('pw_user_idx').on(table.userId),
    playerIdx: index('pw_player_idx').on(table.playerDisplayName),
    userFk: foreignKey({
      name: 'pw_user_fk',
      columns: [table.userId],
      foreignColumns: [user.id],
    }).onDelete('cascade'),
    playerFk: foreignKey({
      name: 'pw_player_fk',
      columns: [table.playerDisplayName],
      foreignColumns: [player.displayName],
    }).onDelete('cascade'),
  }),
);

export const tournamentImport = pgTable(
  'tournament_import',
  {
    tournamentId: uuid('tournament_id').primaryKey(),
    status: tournamentImportStatusEnum('status').notNull().default('pending'),
    attempts: integer('attempts').notNull().default(0),
    lastError: text('last_error'),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
    startedAt: timestamp('started_at', { mode: 'string' }),
    finishedAt: timestamp('finished_at', { mode: 'string' }),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow(),
  },
  table => ({
    statusIdx: index('ti_status_idx').on(table.status),
    createdIdx: index('ti_created_idx').on(table.createdAt),
    tournamentFk: foreignKey({
      name: 'ti_tournament_fk',
      columns: [table.tournamentId],
      foreignColumns: [tournament.id],
    }).onDelete('cascade'),
  }),
);

export const tournamentWeekendRelations = relations(tournamentWeekend, ({ many }) => ({
  tournamentGroups: many(tournamentWeekendTournamentGroup),
  tournaments: many(tournamentWeekendTournament),
}));

export const tournamentWeekendTournamentGroupRelations = relations(
  tournamentWeekendTournamentGroup,
  ({ one }) => ({
    tournamentWeekend: one(tournamentWeekend, {
      fields: [tournamentWeekendTournamentGroup.tournamentWeekendId],
      references: [tournamentWeekend.id],
    }),
    tournamentGroup: one(tournamentGroup, {
      fields: [tournamentWeekendTournamentGroup.tournamentGroupId],
      references: [tournamentGroup.id],
    }),
    format: one(format, {
      fields: [tournamentWeekendTournamentGroup.formatId],
      references: [format.id],
    }),
    meta: one(meta, {
      fields: [tournamentWeekendTournamentGroup.metaId],
      references: [meta.id],
    }),
  }),
);

export const tournamentWeekendTournamentRelations = relations(
  tournamentWeekendTournament,
  ({ one }) => ({
    tournamentWeekend: one(tournamentWeekend, {
      fields: [tournamentWeekendTournament.tournamentWeekendId],
      references: [tournamentWeekend.id],
    }),
    tournament: one(tournament, {
      fields: [tournamentWeekendTournament.tournamentId],
      references: [tournament.id],
    }),
  }),
);

export const playerRelations = relations(player, ({ one, many }) => ({
  user: one(user, {
    fields: [player.userId],
    references: [user.id],
  }),
  standings: many(tournamentStanding),
  weekendPlayers: many(tournamentWeekendPlayer),
  watches: many(playerWatch),
}));

export const tournamentStandingRelations = relations(tournamentStanding, ({ one }) => ({
  tournament: one(tournament, {
    fields: [tournamentStanding.tournamentId],
    references: [tournament.id],
  }),
  player: one(player, {
    fields: [tournamentStanding.playerDisplayName],
    references: [player.displayName],
  }),
}));

export const tournamentWeekendMatchRelations = relations(tournamentWeekendMatch, ({ one }) => ({
  tournament: one(tournament, {
    fields: [tournamentWeekendMatch.tournamentId],
    references: [tournament.id],
  }),
  player1: one(player, {
    fields: [tournamentWeekendMatch.playerDisplayName1],
    references: [player.displayName],
    relationName: 'tournament_weekend_match_player_1',
  }),
  player2: one(player, {
    fields: [tournamentWeekendMatch.playerDisplayName2],
    references: [player.displayName],
    relationName: 'tournament_weekend_match_player_2',
  }),
}));

export const tournamentWeekendPlayerRelations = relations(tournamentWeekendPlayer, ({ one }) => ({
  tournament: one(tournament, {
    fields: [tournamentWeekendPlayer.tournamentId],
    references: [tournament.id],
  }),
  player: one(player, {
    fields: [tournamentWeekendPlayer.playerDisplayName],
    references: [player.displayName],
  }),
}));

export const tournamentWeekendResourceRelations = relations(
  tournamentWeekendResource,
  ({ one }) => ({
    tournament: one(tournament, {
      fields: [tournamentWeekendResource.tournamentId],
      references: [tournament.id],
    }),
    user: one(user, {
      fields: [tournamentWeekendResource.userId],
      references: [user.id],
    }),
  }),
);

export const playerWatchRelations = relations(playerWatch, ({ one }) => ({
  user: one(user, {
    fields: [playerWatch.userId],
    references: [user.id],
  }),
  player: one(player, {
    fields: [playerWatch.playerDisplayName],
    references: [player.displayName],
  }),
}));

export const tournamentImportRelations = relations(tournamentImport, ({ one }) => ({
  tournament: one(tournament, {
    fields: [tournamentImport.tournamentId],
    references: [tournament.id],
  }),
}));

export const tournamentWeekendSchema = {
  tournamentWeekend,
  tournamentWeekendTournamentGroup,
  tournamentWeekendTournament,
  player,
  tournamentStanding,
  tournamentWeekendMatch,
  tournamentWeekendPlayer,
  tournamentWeekendResource,
  playerWatch,
  tournamentImport,
};

export type TournamentWeekend = InferSelectModel<typeof tournamentWeekend>;
export type TournamentWeekendInsert = InferInsertModel<typeof tournamentWeekend>;
export type TournamentWeekendTournamentGroup = InferSelectModel<
  typeof tournamentWeekendTournamentGroup
>;
export type TournamentWeekendTournament = InferSelectModel<typeof tournamentWeekendTournament>;
export type Player = InferSelectModel<typeof player>;
export type PlayerInsert = InferInsertModel<typeof player>;
export type TournamentStanding = InferSelectModel<typeof tournamentStanding>;
export type TournamentStandingInsert = InferInsertModel<typeof tournamentStanding>;
export type TournamentWeekendMatch = InferSelectModel<typeof tournamentWeekendMatch>;
export type TournamentWeekendMatchInsert = InferInsertModel<typeof tournamentWeekendMatch>;
export type TournamentWeekendPlayer = InferSelectModel<typeof tournamentWeekendPlayer>;
export type TournamentWeekendPlayerInsert = InferInsertModel<typeof tournamentWeekendPlayer>;
export type TournamentWeekendResource = InferSelectModel<typeof tournamentWeekendResource>;
export type TournamentWeekendResourceInsert = InferInsertModel<typeof tournamentWeekendResource>;
export type PlayerWatch = InferSelectModel<typeof playerWatch>;
export type TournamentImport = InferSelectModel<typeof tournamentImport>;
export type TournamentImportInsert = InferInsertModel<typeof tournamentImport>;

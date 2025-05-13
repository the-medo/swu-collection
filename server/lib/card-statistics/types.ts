import type {
  CardStatTournament,
  CardStatTournamentLeader,
  CardStatTournamentLeaderBase,
} from '../../db/schema/card_stats_schema.ts';

/**
 * Interface for card statistics data
 */
export interface CardStat {
  cardId: string;
  countMd: number;
  countSb: number;
  deckCount: number;
  matchWin: number;
  matchLose: number;
}

/**
 * Interface for tournament card statistics data
 */
export interface TournamentCardStat extends CardStat {
  tournamentId: string;
}

/**
 * Interface for tournament card statistics with leader data
 */
export interface TournamentCardStatLeader extends TournamentCardStat {
  leaderCardId: string;
}

/**
 * Interface for tournament card statistics with leader and base data
 */
export interface TournamentCardStatLeaderBase extends TournamentCardStatLeader {
  baseCardId: string;
}

/**
 * Interface for tournament statistics computation result
 */
export interface TournamentStatisticsResult {
  cardStats: TournamentCardStat[];
  cardStatsLeader: TournamentCardStatLeader[];
  cardStatsLeaderBase: TournamentCardStatLeaderBase[];
}

/**
 * Type for database insert operations
 */
export type CardStatTournamentInsert = Omit<CardStatTournament, 'id'>;
export type CardStatTournamentLeaderInsert = Omit<CardStatTournamentLeader, 'id'>;
export type CardStatTournamentLeaderBaseInsert = Omit<CardStatTournamentLeaderBase, 'id'>;

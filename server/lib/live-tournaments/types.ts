import type { tournamentWeekendTournamentStatusEnum } from '../../db/schema/tournament_weekend.ts';

export type LiveTournamentStatus =
  (typeof tournamentWeekendTournamentStatusEnum.enumValues)[number];

export type LiveTournamentCheckInput = {
  weekendId: string;
  tournamentId: string;
};

export type LiveMeleeTournamentDetail = {
  meleeId: string;
  status: LiveTournamentStatus;
  exactStart: string | null;
  playerCount: number | null;
  hasDecklists: boolean;
  additionalData?: Record<string, unknown>;
};

export type LiveMeleePlayer = {
  id: number;
  displayName: string;
};

export type LiveMeleeStanding = LiveMeleePlayer & {
  rank: number;
  points: number;
  gameRecord: string;
  matchRecord: string;
};

export type LiveMeleeMatch = {
  matchKey: string;
  roundNumber: number;
  roundName: string;
  player1: LiveMeleePlayer;
  player2: LiveMeleePlayer | null;
  leaderCardId1: string | null;
  baseCardKey1: string | null;
  leaderCardId2: string | null;
  baseCardKey2: string | null;
  player1GameWin: number | null;
  player2GameWin: number | null;
  updatedAt: string | null;
};

export type LiveMeleeTournamentProgress = {
  meleeId: string;
  roundNumber: number;
  roundName: string;
  matchesTotal: number;
  matchesRemaining: number;
  standings: LiveMeleeStanding[];
  matches: LiveMeleeMatch[];
  additionalData?: Record<string, unknown>;
};

export type LiveTournamentBracketRound = {
  roundName: string;
  matches: LiveMeleeMatch[];
};

export type LiveTournamentCheckResult =
  | {
      type: 'skipped';
      weekendId: string;
      tournamentId: string;
      reason: string;
    }
  | {
      type: 'checked';
      weekendId: string;
      tournamentId: string;
      meleeId: string;
      status: LiveTournamentStatus;
      hasDecklists: boolean;
      queuedImport: boolean;
      progress: LiveTournamentProgressCheckResult | null;
    };

export type LiveTournamentProgressCheckResult =
  | {
      type: 'skipped';
      weekendId: string;
      tournamentId: string;
      reason: string;
    }
  | {
      type: 'checked';
      weekendId: string;
      tournamentId: string;
      meleeId: string;
      roundNumber: number;
      roundName: string;
      standingsCount: number;
      matchesCount: number;
      matchesRemaining: number;
      undefeatedPlayers: LiveMeleeStanding[];
      bracket: LiveTournamentBracketRound[];
    };

export type LiveTournamentRound = {
  number: number;
  id: number;
  name: string;
  started: boolean;
  completed: boolean;
};

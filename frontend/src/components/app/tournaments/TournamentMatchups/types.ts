import { SwuAspect } from '../../../../../../types/enums.ts';

export type MatchFilter = 'all' | 'day2' | 'top8' | 'custom';

export type MatchupDisplayMode = 'winLoss' | 'winrate' | 'gameWinLoss' | 'gameWinrate';

export type MatchupKeyInfo = {
  /**
   * Canonical matchup key used by rowKeys, colKeys, and matchups.
   */
  rawKey: string;
  sourceDeckAspects: SwuAspect[][];
};

export type MatchupTableData = {
  rowKeys: string[];
  colKeys: string[];
  matchups: MatchupDataMap;
  totalStats?: Map<string, MatchupTotalData>;
  keyInfo: Record<string, MatchupKeyInfo>;
};

export type MatchupData = {
  wins: number;
  losses: number;
  gameWins: number;
  gameLosses: number;
};

export type MatchupTotalData = {
  totalWins: number;
  totalLosses: number;
  totalGameWins: number;
  totalGameLosses: number;
};

export type MatchupDataMap = Record<string, Record<string, MatchupData>>;

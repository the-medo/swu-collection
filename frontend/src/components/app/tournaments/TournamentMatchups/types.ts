export type MatchFilter = 'all' | 'day2' | 'custom';

export type MatchupDisplayMode = 'winLoss' | 'winrate' | 'gameWinLoss' | 'gameWinrate';

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

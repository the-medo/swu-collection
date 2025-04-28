export type MatchFilter = 'all' | 'day2' | 'custom';

export type MatchupDisplayMode = 'winLoss' | 'winrate' | 'gameWinLoss' | 'gameWinrate';

export type MatchupData = Record<string, Record<string, { 
  wins: number; 
  losses: number;
  gameWins: number;
  gameLosses: number;
}>>;

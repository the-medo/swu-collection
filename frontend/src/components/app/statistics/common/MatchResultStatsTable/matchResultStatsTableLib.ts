import { MatchResult } from '@/components/app/statistics/lib/MatchResult.ts';

export const matchResultStatsTableSortColumns = [
  'gameWinLossRatio',
  'key',
  'lastPlayedAt',
  'totalMatches',
  'matchWins',
  'matchLosses',
  'matchWinrate',
  'totalGames',
  'gameWins',
  'gameLosses',
  'gameWinrate',
] as const;

export type MatchResultStatsTableSortColumn = (typeof matchResultStatsTableSortColumns)[number];

export type MatchResultStatsTableRow = {
  key: string;
  totalMatches: number;
  matchWins: number;
  matchLosses: number;
  matchDraws: number;
  matchWinrate: number;
  totalGames: number;
  gameWins: number;
  gameLosses: number;
  gameWinrate: number;
  lastPlayedAt?: string;
  lastPlayedAtMs: number;
};

export const headerGroupClass =
  'px-4 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800';
export const tableCellClass = 'px-4 py-1 border-x border-slate-200 dark:border-slate-800';
export const numericCellClass = `${tableCellClass} text-right`;
export const defaultSortColumn: MatchResultStatsTableSortColumn = 'totalMatches';

export const isSortColumn = (value: unknown): value is MatchResultStatsTableSortColumn =>
  typeof value === 'string' &&
  (matchResultStatsTableSortColumns as readonly string[]).includes(value);

export const getSortedRowDifference = (
  a: MatchResultStatsTableRow,
  b: MatchResultStatsTableRow,
  column: MatchResultStatsTableSortColumn,
) => {
  switch (column) {
    case 'key':
      return a.key.localeCompare(b.key);
    case 'lastPlayedAt':
      return a.lastPlayedAtMs - b.lastPlayedAtMs;
    case 'gameWinLossRatio':
      return (
        a.gameWinrate - b.gameWinrate ||
        a.totalGames - b.totalGames ||
        a.gameWins - b.gameWins ||
        a.key.localeCompare(b.key)
      );
    case 'totalMatches':
      return a.totalMatches - b.totalMatches || b.lastPlayedAtMs - a.lastPlayedAtMs;
    case 'matchWins':
      return a.matchWins - b.matchWins || a.totalMatches - b.totalMatches;
    case 'matchLosses':
      return a.matchLosses - b.matchLosses || a.totalMatches - b.totalMatches;
    case 'matchWinrate':
      return a.matchWinrate - b.matchWinrate || a.totalMatches - b.totalMatches;
    case 'totalGames':
      return a.totalGames - b.totalGames || b.lastPlayedAtMs - a.lastPlayedAtMs;
    case 'gameWins':
      return a.gameWins - b.gameWins || a.totalGames - b.totalGames;
    case 'gameLosses':
      return a.gameLosses - b.gameLosses || a.totalGames - b.totalGames;
    case 'gameWinrate':
      return a.gameWinrate - b.gameWinrate || a.totalGames - b.totalGames;
    default:
      return 0;
  }
};

export const getGameRecord = (match: MatchResult) => {
  if (match.finalWins !== undefined || match.finalLosses !== undefined) {
    return {
      wins: match.finalWins ?? 0,
      losses: match.finalLosses ?? 0,
    };
  }

  let wins = 0;
  let losses = 0;

  match.games.forEach(game => {
    if (game.isWinner === true) wins++;
    else if (game.isWinner === false) losses++;
  });

  return { wins, losses };
};

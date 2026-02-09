import { MatchupResult } from '@/components/app/statistics/lib/useAnalyzeMatchups.ts';

export enum MatchupSort {
  matchesTotal = 'matchesTotal',
  matchesWinrate = 'matchesWinrate',
  gamesTotal = 'gamesTotal',
  gamesWinrate = 'gamesWinrate',
}

export const sortMatchups = (
  matchups: [string, MatchupResult][],
  sortMode: MatchupSort,
): [string, MatchupResult][] => {
  return [...matchups].sort((a, b) => {
    switch (sortMode) {
      case MatchupSort.matchesTotal:
        return b[1].total - a[1].total;
      case MatchupSort.matchesWinrate: {
        const wrA = a[1].total > 0 ? a[1].wins / a[1].total : 0;
        const wrB = b[1].total > 0 ? b[1].wins / b[1].total : 0;
        return wrB - wrA;
      }
      case MatchupSort.gamesTotal:
        return b[1].gameTotal - a[1].gameTotal;
      case MatchupSort.gamesWinrate: {
        const wrA = a[1].gameTotal > 0 ? a[1].gameWins / a[1].gameTotal : 0;
        const wrB = b[1].gameTotal > 0 ? b[1].gameWins / b[1].gameTotal : 0;
        return wrB - wrA;
      }
      default:
        return b[1].total - a[1].total;
    }
  });
};

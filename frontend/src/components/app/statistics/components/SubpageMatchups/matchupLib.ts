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
        return b[1].matchesTotal - a[1].matchesTotal;
      case MatchupSort.matchesWinrate: {
        const wrA = a[1].matchesTotal > 0 ? a[1].matchesWon / a[1].matchesTotal : 0;
        const wrB = b[1].matchesTotal > 0 ? b[1].matchesWon / b[1].matchesTotal : 0;
        return wrB - wrA;
      }
      case MatchupSort.gamesTotal:
        return b[1].gamesTotal - a[1].gamesTotal;
      case MatchupSort.gamesWinrate: {
        const wrA = a[1].gamesTotal > 0 ? a[1].gamesWon / a[1].gamesTotal : 0;
        const wrB = b[1].gamesTotal > 0 ? b[1].gamesWon / b[1].gamesTotal : 0;
        return wrB - wrA;
      }
      default:
        return b[1].matchesTotal - a[1].matchesTotal;
    }
  });
};

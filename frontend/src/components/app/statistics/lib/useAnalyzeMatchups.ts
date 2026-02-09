import { useMemo } from 'react';
import { MatchResult } from '@/components/app/statistics/lib/MatchResult.ts';
import {
  getDeckKeyFromMatchResult,
  getOpponentDeckKeyFromMatchResult,
} from '@/components/app/statistics/lib/lib.ts';

export type MatchupResult = {
  matchesTotal: number;
  matchesWon: number;
  matchesLost: number;
  matchesDrawn: number;

  gamesTotal: number;
  gamesWon: number;
  gamesLost: number;
};

export type AnalyzedMatchups = Record<string, MatchupResult>;
export type AnalyzedMatchupsMatrix = Record<string, AnalyzedMatchups>;

export const useAnalyzeMatchups = (matches: MatchResult[]) => {
  return useMemo(() => {
    const matrix: AnalyzedMatchupsMatrix = {};

    matches.forEach(m => {
      const deckKey = getDeckKeyFromMatchResult(m); //this is matrix key (in AnalyzedMatchupsMatrix)
      const opponentDeckKey = getOpponentDeckKeyFromMatchResult(m); // this is the matchup result key (in AnalyzedMatchups)

      if (!matrix[deckKey]) {
        matrix[deckKey] = {};
      }

      if (!matrix[deckKey][opponentDeckKey]) {
        matrix[deckKey][opponentDeckKey] = {
          matchesTotal: 0,
          matchesWon: 0,
          matchesLost: 0,
          matchesDrawn: 0,
          gamesTotal: 0,
          gamesWon: 0,
          gamesLost: 0,
        };
      }

      const entry = matrix[deckKey][opponentDeckKey];

      entry.matchesTotal++;
      if (m.result === 3) {
        entry.matchesWon++;
      } else if (m.result === 0) {
        entry.matchesLost++;
      } else if (m.result === 1) {
        entry.matchesDrawn++;
      }

      const wins = m.finalWins ?? 0;
      const losses = m.finalLosses ?? 0;

      entry.gamesWon += wins;
      entry.gamesLost += losses;
      entry.gamesTotal += wins + losses;
    });

    return matrix;
  }, [matches]);
};

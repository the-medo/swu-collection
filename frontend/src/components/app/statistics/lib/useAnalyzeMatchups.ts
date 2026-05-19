import { useMemo } from 'react';
import type { MatchResult } from '@/components/app/statistics/lib/MatchResult.ts';
import {
  getDeckKeyFromMatchResult,
  getOpponentDeckKeyFromMatchResult,
} from '@/components/app/statistics/lib/lib.ts';
import type {
  MatchupData,
  MatchupKeyInfo,
  MatchupTotalData,
} from '@/components/app/tournaments/TournamentMatchups/types.ts';
import type { CardListResponse } from '@/api/lists/useCardList.ts';
import { processBase } from '../../../../../../shared/lib/processBase.ts';

export type MatchupResult = MatchupData & {
  total: number;
  draws: number;
  gameTotal: number;
};

export type AnalyzedMatchupOpponents = Record<string, MatchupResult>;
export type AnalyzedMatchupsMatrix = Record<string, AnalyzedMatchupOpponents>;
export type AnalyzedMatchups = {
  rowKeys: string[];
  colKeys: string[];
  matchups: AnalyzedMatchupsMatrix;
  totalStats: Map<string, MatchupTotalData>;
  keyInfo: Record<string, MatchupKeyInfo>;
};

const getMatchResultDeckAspects = (
  leaderCardId: string | undefined,
  baseCardKey: string | undefined,
  cardListData: CardListResponse | undefined,
) => {
  const cardList = cardListData?.cards;
  if (!cardList) return [];

  const leaderAspects = leaderCardId ? (cardList[leaderCardId]?.aspects ?? []) : [];
  const baseAspects = baseCardKey ? processBase(baseCardKey, cardList).aspects : [];

  return Array.from(new Set([...leaderAspects, ...baseAspects]));
};

const addKeyInfo = (
  keyInfo: Record<string, MatchupKeyInfo>,
  key: string,
  leaderCardId: string | undefined,
  baseCardKey: string | undefined,
  cardListData: CardListResponse | undefined,
) => {
  const info = (keyInfo[key] ??= { rawKey: key, sourceDeckAspects: [] });
  const sourceDeckAspects = getMatchResultDeckAspects(leaderCardId, baseCardKey, cardListData);

  if (
    sourceDeckAspects.length > 0 &&
    !info.sourceDeckAspects.some(aspects => aspects.join('|') === sourceDeckAspects.join('|'))
  ) {
    info.sourceDeckAspects.push(sourceDeckAspects);
  }
};

export const useAnalyzeMatchups = (
  matches: MatchResult[],
  cardListData?: CardListResponse,
): AnalyzedMatchups => {
  return useMemo(() => {
    const matrix: AnalyzedMatchupsMatrix = {};
    const opponentDeckKeys: Record<string, number> = {};
    const keyInfo: Record<string, MatchupKeyInfo> = {};

    matches.forEach(m => {
      const deckKey = getDeckKeyFromMatchResult(m); //this is matrix key (in AnalyzedMatchupsMatrix)
      const opponentDeckKey = getOpponentDeckKeyFromMatchResult(m); // this is the matchup result key (in AnalyzedMatchups)
      addKeyInfo(keyInfo, deckKey, m.leaderCardId, m.baseCardKey, cardListData);
      addKeyInfo(
        keyInfo,
        opponentDeckKey,
        m.opponentLeaderCardId,
        m.opponentBaseCardKey,
        cardListData,
      );

      if (!opponentDeckKeys[opponentDeckKey]) {
        opponentDeckKeys[opponentDeckKey] = 0;
      }
      opponentDeckKeys[opponentDeckKey]++;

      if (!matrix[deckKey]) {
        matrix[deckKey] = {};
      }

      if (!matrix[deckKey][opponentDeckKey]) {
        matrix[deckKey][opponentDeckKey] = {
          total: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          gameTotal: 0,
          gameWins: 0,
          gameLosses: 0,
        };
      }

      const entry = matrix[deckKey][opponentDeckKey];

      entry.total++;
      if (m.result === 3) {
        entry.wins++;
      } else if (m.result === 0) {
        entry.losses++;
      } else if (m.result === 1) {
        entry.draws++;
      }

      const wins = m.finalWins ?? 0;
      const losses = m.finalLosses ?? 0;

      entry.gameWins += wins;
      entry.gameLosses += losses;
      entry.gameTotal += wins + losses;
    });

    // Calculate total match count and win/loss stats for each deck type
    const matchCounts = new Map<string, number>();
    const totalStats: Map<string, MatchupTotalData> = new Map();
    const deckKeys = Object.keys(matrix);

    deckKeys.forEach(key => {
      let totalMatches = 0;
      let totalWins = 0;
      let totalLosses = 0;
      let totalGameWins = 0;
      let totalGameLosses = 0;

      Object.values(matrix[key]).forEach(winsLosses => {
        totalMatches += winsLosses.wins + winsLosses.losses;
        totalWins += winsLosses.wins;
        totalLosses += winsLosses.losses;
        totalGameWins += winsLosses.gameWins;
        totalGameLosses += winsLosses.gameLosses;
      });

      matchCounts.set(key, totalMatches);
      totalStats.set(key, { totalWins, totalLosses, totalGameWins, totalGameLosses });
    });

    // Sort keys by total match count (descending)
    const sortedRowKeys = deckKeys.sort((a, b) => {
      return (matchCounts.get(b) || 0) - (matchCounts.get(a) || 0);
    });
    const sortedColKeys = Object.keys(opponentDeckKeys).sort((a, b) => {
      return opponentDeckKeys[b] - opponentDeckKeys[a];
    });

    return {
      rowKeys: sortedRowKeys,
      colKeys: sortedColKeys,
      matchups: matrix,
      totalStats,
      keyInfo,
    };
  }, [matches, cardListData]);
};

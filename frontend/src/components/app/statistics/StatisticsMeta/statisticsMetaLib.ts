import { MatchResult } from '@/components/app/statistics/lib/MatchResult.ts';
import { getDeckKey } from '@/components/app/statistics/lib/lib.ts';

export const unknownOpponentMetaKey = 'unknown';

export interface StatisticsMetaDataItem {
  key: string;
  count: number;
  wins: number;
  losses: number;
  draws: number;
  gameWins: number;
  gameLosses: number;
  percentage: number;
}

export const getStatisticsMetaKey = (
  leaderCardId: string | undefined,
  baseCardKey: string | undefined,
) => {
  if (!leaderCardId || !baseCardKey) {
    return unknownOpponentMetaKey;
  }

  return getDeckKey(leaderCardId, baseCardKey);
};

export const getOpponentMetaKey = (match: MatchResult) => {
  return getStatisticsMetaKey(match.opponentLeaderCardId, match.opponentBaseCardKey);
};

export const getPlayerMetaKey = (match: MatchResult) => {
  return getStatisticsMetaKey(match.leaderCardId, match.baseCardKey);
};

export const toOpponentPerspectiveMatchResult = (match: MatchResult): MatchResult => {
  return {
    ...match,
    leaderCardId: match.opponentLeaderCardId,
    baseCardKey: match.opponentBaseCardKey,
    opponentLeaderCardId: match.leaderCardId,
    opponentBaseCardKey: match.baseCardKey,
    result: match.result === 3 ? 0 : match.result === 0 ? 3 : match.result,
    finalWins: match.finalLosses,
    finalLosses: match.finalWins,
    deckId: undefined,
    userEventId: undefined,
    userName: match.inTeamOppUserName ?? match.userName,
    inTeamOppUserName: match.userName,
  };
};

export const analyzeStatisticsMeta = (matches: MatchResult[]): StatisticsMetaDataItem[] => {
  if (matches.length === 0) {
    return [];
  }

  const countMap = new Map<string, Omit<StatisticsMetaDataItem, 'percentage'>>();

  matches.forEach(match => {
    const opponentMatch = toOpponentPerspectiveMatchResult(match);
    const key = getPlayerMetaKey(opponentMatch);
    const existingItem = countMap.get(key) ?? {
      key,
      count: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      gameWins: 0,
      gameLosses: 0,
    };

    existingItem.count += 1;

    if (opponentMatch.result === 3) {
      existingItem.wins += 1;
    } else if (opponentMatch.result === 0) {
      existingItem.losses += 1;
    } else if (opponentMatch.result === 1) {
      existingItem.draws += 1;
    }

    existingItem.gameWins += opponentMatch.finalWins ?? 0;
    existingItem.gameLosses += opponentMatch.finalLosses ?? 0;

    countMap.set(key, existingItem);
  });

  return Array.from(countMap.values())
    .map(item => ({
      ...item,
      percentage: parseFloat(((item.count / matches.length) * 100).toFixed(1)),
    }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
};

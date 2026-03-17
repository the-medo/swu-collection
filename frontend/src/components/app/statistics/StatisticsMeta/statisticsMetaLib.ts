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

export const getOpponentMetaKey = (match: MatchResult) => {
  if (!match.opponentLeaderCardId || !match.opponentBaseCardKey) {
    return unknownOpponentMetaKey;
  }

  return getDeckKey(match.opponentLeaderCardId, match.opponentBaseCardKey);
};

export const analyzeStatisticsMeta = (matches: MatchResult[]): StatisticsMetaDataItem[] => {
  if (matches.length === 0) {
    return [];
  }

  const countMap = new Map<string, Omit<StatisticsMetaDataItem, 'percentage'>>();

  matches.forEach(match => {
    const key = getOpponentMetaKey(match);
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

    if (match.result === 3) {
      existingItem.wins += 1;
    } else if (match.result === 0) {
      existingItem.losses += 1;
    } else if (match.result === 1) {
      existingItem.draws += 1;
    }

    existingItem.gameWins += match.finalWins ?? 0;
    existingItem.gameLosses += match.finalLosses ?? 0;

    countMap.set(key, existingItem);
  });

  return Array.from(countMap.values())
    .map(item => ({
      ...item,
      percentage: parseFloat(((item.count / matches.length) * 100).toFixed(1)),
    }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
};

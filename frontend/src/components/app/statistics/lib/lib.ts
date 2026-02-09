import { MatchResult } from '@/components/app/statistics/lib/MatchResult.ts';
import { basicBaseForAspect } from '../../../../../../shared/lib/basicBases.ts';
import { DeckStatistics } from '@/components/app/statistics/lib/deckLib.ts';

export const getResultColor = (result?: number) => {
  switch (result) {
    case 3:
      return 'bg-green-500 hover:bg-green-600';
    case 1:
      return 'bg-yellow-500 hover:bg-yellow-600';
    case 0:
      return 'bg-red-500 hover:bg-red-600';
    default:
      return 'bg-gray-500';
  }
};

export const getResultBorderColor = (result?: number) => {
  switch (result) {
    case 3:
      return 'border-green-500';
    case 1:
      return 'border-yellow-500';
    case 0:
      return 'border-red-500';
    default:
      return 'border-gray-500';
  }
};

export const getResultText = (result?: number) => {
  switch (result) {
    case 3:
      return 'Win';
    case 1:
      return 'Draw';
    case 0:
      return 'Loss';
    default:
      return 'Unknown';
  }
};

export const getDeckKey = (leaderCardId: string | undefined, baseCardKey: string | undefined) =>
  `${leaderCardId}|${baseCardKey}`;

export const getDeckKeyFromMatchResult = (match: MatchResult) =>
  getDeckKey(match.leaderCardId, match.baseCardKey);

export const getDeckKeyFromDeckStatistics = (ds: DeckStatistics | undefined) =>
  getDeckKey(ds?.leaderCardId, ds?.baseCardKey);

export const getOpponentDeckKeyFromMatchResult = (match: MatchResult) =>
  getDeckKey(match.opponentLeaderCardId, match.opponentBaseCardKey);

export const getCardIdFromKey = (key: string | undefined, cards: any) => {
  if (!key || !cards) return undefined;
  return key in cards ? key : basicBaseForAspect[key];
};

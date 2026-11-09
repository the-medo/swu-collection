import type { CardStatsParams } from './useCardStats.ts';
import type { TopPlayedCardsParams } from './useTopPlayedCards.ts';

export const cardStatsKeys = {
  all: ['card-stats'] as const,
  list: ({ metaId, tournamentId, tournamentGroupId, leaderCardId, baseCardId }: CardStatsParams) =>
    ['card-stats', metaId, tournamentId, tournamentGroupId, leaderCardId, baseCardId] as const,
  topPlayed: ({
    metaId,
    tournamentId,
    tournamentGroupId,
    leaderIds,
    leaderBasePairs,
    limit,
  }: TopPlayedCardsParams) =>
    [
      'card-stats',
      'top-played',
      metaId,
      tournamentId,
      tournamentGroupId,
      leaderIds,
      leaderBasePairs,
      limit,
    ] as const,
  metaDeckCounts: (metaId: number | undefined) => ['card-stats', 'deck-counts', metaId] as const,
};

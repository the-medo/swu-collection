/**
 * Card Statistics API Hooks
 * 
 * This module provides hooks for fetching and computing card statistics data from the API.
 */

export { useCardStats } from './useCardStats.ts';
export type { CardStat, CardStatsResponse, CardStatsParams } from './useCardStats.ts';

export { useComputeCardStats } from './useComputeCardStats.ts';
export type { ComputeCardStatsParams, ComputeCardStatsResponse } from './useComputeCardStats.ts';

export { useTopPlayedCards } from './useTopPlayedCards.ts';
export type { TopPlayedCardStat, TopPlayedCardsParams, TopPlayedCardsResponse } from './useTopPlayedCards.ts';

export { useMatchupCardStats } from './useMatchupCardStats.ts';
export type { MatchupCardStatsParams, MatchupCardStatsResponse } from './useMatchupCardStats.ts';

export { useMatchupStatDecks } from './useMatchupStatDecks.ts';
export type { MatchupStatDecksParams, MatchupStatDecksResponse } from './useMatchupStatDecks.ts';

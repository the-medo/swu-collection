import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';
import { CardStat } from './useCardStats.ts';

/**
 * Card statistics with leader and base information
 */
export interface TopPlayedCardStat extends CardStat {
  leaderCardId?: string;
  baseCardId?: string;
  totalCount: number;
}

/**
 * Parameters for the useTopPlayedCards hook
 */
export interface TopPlayedCardsParams {
  metaId?: number;
  tournamentId?: string;
  tournamentGroupId?: string;
  leaderIds?: string[];
  leaderBasePairs?: string[];
  limit?: number;
}

/**
 * Response from the top played cards API
 */
export interface TopPlayedCardsResponse {
  data: Record<string, TopPlayedCardStat[]>;
}

/**
 * Hook for fetching top played cards
 * @param params - Parameters for the top played cards query
 * @returns Query result with top played cards data grouped by leader or leader/base combination
 */
export const useTopPlayedCards = (params: TopPlayedCardsParams) => {
  const { metaId, tournamentId, tournamentGroupId, leaderIds, leaderBasePairs, limit } = params;

  // Either metaId or tournamentId must be provided
  const isValidQuery =
    metaId !== undefined || tournamentId !== undefined || tournamentGroupId !== undefined;

  return useQuery<TopPlayedCardsResponse, ErrorWithStatus>({
    queryKey: ['card-stats', 'top-played', metaId, tournamentId, leaderIds, leaderBasePairs, limit],
    queryFn: isValidQuery
      ? async () => {
          // Build query parameters
          const queryParams: Record<string, string> = {};

          if (metaId !== undefined) {
            queryParams.meta_id = metaId.toString();
          }

          if (tournamentId !== undefined) {
            queryParams.tournament_id = tournamentId;
          }

          if (tournamentGroupId !== undefined) {
            queryParams.tournament_group_id = tournamentGroupId;
          }

          if (leaderIds && leaderIds.length > 0) {
            queryParams.leader_ids = leaderIds.join(',');
          }

          if (leaderBasePairs && leaderBasePairs.length > 0) {
            queryParams.leader_base_pairs = leaderBasePairs.join(',');
          }

          if (limit !== undefined) {
            queryParams.limit = limit.toString();
          }

          // Make the API request
          const response = await api['card-stats']['top-played'].$get({
            query: queryParams,
          });

          if (!response.ok) {
            if (response.status === 404) {
              const error: ErrorWithStatus = new Error('Top played cards not found');
              error.status = 404;
              throw error;
            }
            throw new Error('Something went wrong');
          }

          const data = await response.json();
          return data as TopPlayedCardsResponse;
        }
      : skipToken,
    retry: (failureCount, error) => (error.status === 404 ? false : failureCount < 3),
    staleTime: Infinity, // 5 minutes
  });
};

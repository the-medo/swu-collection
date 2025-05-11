import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';

/**
 * Card statistics data interface
 */
export interface CardStat {
  cardId: string;
  countMd: number;
  countSb: number;
  deckCount: number;
  matchWin: number;
  matchLose: number;
}

/**
 * Parameters for the useCardStats hook
 */
export interface CardStatsParams {
  metaId?: number;
  tournamentId?: string;
  leaderCardId?: string;
  baseCardId?: string;
}

/**
 * Card statistics data interface with additional parameters
 */
export interface CardStatExtended extends CardStat, CardStatsParams {}

/**
 * Response from the card statistics API
 */
export interface CardStatsResponse {
  data: CardStatExtended[];
}

/**
 * Hook for fetching card statistics
 * @param params - Parameters for the card statistics query
 * @returns Query result with card statistics data
 */
export const useCardStats = (params: CardStatsParams) => {
  const { metaId, tournamentId, leaderCardId, baseCardId } = params;

  // Either metaId or tournamentId must be provided
  const isValidQuery = metaId !== undefined || tournamentId !== undefined;

  // If baseCardId is provided, leaderCardId must also be provided
  const isValidParams = baseCardId === undefined || leaderCardId !== undefined;

  return useQuery<CardStatsResponse, ErrorWithStatus>({
    queryKey: ['card-stats', metaId, tournamentId, leaderCardId, baseCardId],
    queryFn:
      isValidQuery && isValidParams
        ? async () => {
            // Build query parameters
            const queryParams: Record<string, string> = {};

            if (metaId !== undefined) {
              queryParams.meta_id = metaId.toString();
            }

            if (tournamentId !== undefined) {
              queryParams.tournament_id = tournamentId;
            }

            if (leaderCardId !== undefined) {
              queryParams.leader_card_id = leaderCardId;
            }

            if (baseCardId !== undefined) {
              queryParams.base_card_id = baseCardId;
            }

            // Make the API request
            const response = await api['card-stats'].$get({
              query: queryParams,
            });

            if (!response.ok) {
              if (response.status === 404) {
                const error: ErrorWithStatus = new Error('Card statistics not found');
                error.status = 404;
                throw error;
              }
              throw new Error('Something went wrong');
            }

            const data = await response.json();
            return data as CardStatsResponse;
          }
        : skipToken,
    retry: (failureCount, error) => (error.status === 404 ? false : failureCount < 3),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

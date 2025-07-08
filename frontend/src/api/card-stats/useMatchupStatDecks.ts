import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';

/**
 * Parameters for the useMatchupStatDecks hook
 */
export interface MatchupStatDecksParams {
  overviewId: string;
  key: string;
}

/**
 * Response from the matchup-stats-decks API
 */
export interface MatchupStatDecksResponse {
  data: {
    deckIds: string[];
  };
}

/**
 * Hook for fetching deck IDs from matchup statistics
 * @param params - Parameters for the matchup-stats-decks query
 * @returns Query result with deck IDs
 */
export const useMatchupStatDecks = (params: MatchupStatDecksParams) => {
  const { overviewId, key } = params;

  // Both overviewId and key must be provided
  const isValidQuery = overviewId !== undefined && key !== undefined;

  return useQuery<MatchupStatDecksResponse, ErrorWithStatus>({
    queryKey: ['matchup-stats-decks', overviewId, key],
    queryFn: isValidQuery
      ? async () => {
          // Build query parameters
          const queryParams = {
            overviewId,
            key,
          };

          // Make the API request
          const response = await api['card-stats']['matchup-stats']['decks'].$get({
            query: queryParams,
          });

          if (!response.ok) {
            if (response.status === 404) {
              const error: ErrorWithStatus = new Error('Matchup stats decks not found');
              error.status = 404;
              throw error;
            }
            if (response.status === 400) {
              const error: ErrorWithStatus = new Error('Invalid key path');
              error.status = 400;
              throw error;
            }
            throw new Error('Something went wrong');
          }

          const data = await response.json();
          return data as MatchupStatDecksResponse;
        }
      : skipToken,
    retry: (failureCount, error) =>
      error.status === 404 || error.status === 400 ? false : failureCount < 3,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

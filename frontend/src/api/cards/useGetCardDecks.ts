import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';
import type { CardDeckData } from '../../../../types/CardDeckData.ts';

/**
 * Parameters for the useGetCardDecks hook
 */
export interface CardDecksParams {
  cardId: string;
  tournamentId?: string;
  tournamentGroupId?: string;
  metaId?: number;
  leaderCardId?: string;
  baseCardId?: string;
}

/**
 * Response from the card decks API
 */
export interface CardDecksResponse {
  data: CardDeckData[];
}

/**
 * Hook for fetching decks that contain a specific card
 * @param params - Parameters for the card decks query
 * @returns Query result with card decks data
 */
export const useGetCardDecks = (params: CardDecksParams) => {
  const { cardId, tournamentId, tournamentGroupId, metaId, leaderCardId, baseCardId } = params;

  // Either metaId or tournamentId must be provided
  const isValidQuery =
    cardId !== undefined &&
    (metaId !== undefined || tournamentId !== undefined || tournamentGroupId !== undefined);

  return useQuery<CardDecksResponse, ErrorWithStatus>({
    queryKey: ['card-decks', cardId, metaId, tournamentId, leaderCardId, baseCardId],
    queryFn: isValidQuery
      ? async () => {
          // Make the API request
          const response = await api.cards[':id'].decks.$get({
            param: { id: cardId },
            query: {
              metaId: metaId?.toString(),
              tournamentId,
              tournamentGroupId,
              leaderCardId,
              baseCardId,
            },
          });

          if (!response.ok) {
            if (response.status === 404) {
              const error: ErrorWithStatus = new Error('Card decks not found');
              error.status = 404;
              throw error;
            }
            throw new Error('Something went wrong');
          }

          const data = await response.json();
          return data as CardDecksResponse;
        }
      : skipToken,
    retry: (failureCount, error) => (error.status === 404 ? false : failureCount < 3),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

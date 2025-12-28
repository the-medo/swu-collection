import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';
import type { CardDeckData } from '../../../../types/CardDeckData.ts';

export interface DecksForModalsParams {
  tournamentId?: string;
  tournamentGroupId?: string;
  metaId?: number;
  leaderCardId?: string;
  baseCardId?: string;
}

export interface DecksForModalsResponse {
  data: CardDeckData[];
}

export const useGetDecksForModals = (params: DecksForModalsParams) => {
  const { tournamentId, tournamentGroupId, metaId, leaderCardId, baseCardId } = params;

  const isValidQuery =
    metaId !== undefined || tournamentId !== undefined || tournamentGroupId !== undefined;

  return useQuery<DecksForModalsResponse, ErrorWithStatus>({
    queryKey: [
      'decks-for-modals',
      metaId,
      tournamentId,
      tournamentGroupId,
      leaderCardId,
      baseCardId,
    ],
    queryFn: isValidQuery
      ? async () => {
          const response = await api.deck['for-modals'].data.$get({
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
              const error: ErrorWithStatus = new Error('Decks not found');
              error.status = 404;
              throw error;
            }
            throw new Error('Something went wrong');
          }

          const data = await response.json();
          return data as DecksForModalsResponse;
        }
      : skipToken,
    retry: (failureCount, error) => (error.status === 404 ? false : failureCount < 3),
    staleTime: 5 * 60 * 1000,
  });
};

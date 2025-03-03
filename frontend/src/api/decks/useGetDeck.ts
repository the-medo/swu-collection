import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';
import type { UserDeckData } from '../user/useGetUserDecks.ts';

export const useGetDeck = (deckId: string | undefined) => {
  return useQuery<UserDeckData, ErrorWithStatus>({
    queryKey: ['deck', deckId],
    queryFn: deckId
      ? async () => {
          const response = await api.deck[':id'].$get({
            param: {
              id: deckId,
            },
          });
          if (!response.ok) {
            if (response.status === 404) {
              // Create a custom error with a status property
              const error: ErrorWithStatus = new Error('Deck not found');
              error.status = 404;
              throw error;
            }
            throw new Error('Something went wrong');
          }
          const data = await response.json();
          return data;
        }
      : skipToken,
    retry: (failureCount, error) => (error.status === 404 ? false : failureCount < 3),
    staleTime: Infinity,
  });
};

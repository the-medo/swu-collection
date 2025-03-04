import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { DeckCard } from '../../../../types/ZDeckCard.ts';

export interface DeckCardResponse {
  data: DeckCard[];
}

export const useGetDeckCards = (deckId: string | undefined) => {
  return useQuery<DeckCardResponse>({
    queryKey: ['deck-content', deckId],
    queryFn: deckId
      ? async () => {
          const response = await api.deck[':id'].card.$get({
            param: {
              id: deckId,
            },
          });
          if (!response.ok) {
            throw new Error('Something went wrong');
          }
          const data = await response.json();
          return data;
        }
      : skipToken,
    staleTime: Infinity,
  });
};

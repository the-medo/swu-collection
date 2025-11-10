import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import type { GetCardPoolDeckCardsResponse } from '../../../../server/routes/card-pools/_id/decks/_deckId/card/get.ts';

export const useGetCardPoolDeckCards = (id: string | undefined, deckId: string | undefined) => {
  return useQuery<GetCardPoolDeckCardsResponse>({
    queryKey: ['card-pool-deck-cards', id, deckId],
    queryFn:
      id && deckId
        ? async () => {
            const res = await api['card-pools'][':id'].decks[':deckId'].card.$get({
              param: { id, deckId },
            });
            if (!res.ok) {
              throw new Error('Failed to fetch card pool deck cards');
            }
            return (await res.json()) as GetCardPoolDeckCardsResponse;
          }
        : skipToken,
    staleTime: Infinity,
  });
};

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { dailySealedKeys } from './dailySealedKeys.ts';
import type { GetCardPoolDeckCardsResponse } from '../../../../server/routes/card-pools/_id/decks/_deckId/card/get.ts';

export type CardLocation = 'pool' | 'deck' | 'trash';

export interface UpdateCardPoolDeckCardBody {
  cardPoolNumbers: number[];
  location: CardLocation;
}

export interface UpdateCardPoolDeckCardResponse {
  data: {
    deckId: string;
    cardPoolNumbers: number[];
    location: CardLocation;
  };
}

export const useUpdateCardPoolDeckCard = (id: string | undefined, deckId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation<UpdateCardPoolDeckCardResponse, Error, UpdateCardPoolDeckCardBody>({
    mutationFn: async body => {
      if (!id || !deckId) throw new Error('Card pool id and deck id are required');
      const res = await api['card-pools'][':id'].decks[':deckId'].card.$patch({
        param: { id, deckId },
        json: body,
      });
      if (!res.ok) {
        throw new Error('Failed to update deck card location');
      }
      return (await res.json()) as UpdateCardPoolDeckCardResponse;
    },
    onSuccess: res => {
      // Directly update the cache used by useGetCardPoolDeckCards
      queryClient.setQueryData<GetCardPoolDeckCardsResponse>(
        ['card-pool-deck-cards', id, deckId],
        oldData => {
          if (!oldData || typeof oldData !== 'object') return oldData;
          const next = { ...oldData };

          for (const num of res.data.cardPoolNumbers ?? []) {
            const card = next[num];
            if (card) {
              next[num] = { ...card, location: res.data.location };
            }
          }

          return next;
        },
      );

      /**
       * Invalidate whole deck-content, because the card location has changed
       * Maybe in the future we can update individual cache entries, but not needed now, because
       * these cards are updated on different screen than the deck view - for now, we can refetch them everytime user changes the view.
       * Also, I probably just should've just written this to AI instead of writing this comment and it would be done by now, instead of the future..
       */
      void queryClient.invalidateQueries({ queryKey: ['deck-content', deckId] });
      void queryClient.invalidateQueries({ queryKey: ['deck', deckId] });
      void queryClient.invalidateQueries({ queryKey: ['decks'] });
      void queryClient.invalidateQueries({ queryKey: ['card-pool-decks', id] });
      void queryClient.invalidateQueries({ queryKey: dailySealedKeys.all });
    },
  });
};

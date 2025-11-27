import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';

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
      queryClient.setQueryData(['card-pool-deck-cards', id, deckId], (oldData: any) => {
        if (!oldData || typeof oldData !== 'object') return oldData;
        const next = { ...oldData } as Record<string, { location: CardLocation; cardId: string }>;

        for (const num of res.data.cardPoolNumbers ?? []) {
          const key = String(num);
          if (next[key]) {
            next[key] = { ...next[key], location: res.data.location };
          }
        }

        return next;
      });

      // Invalidate other potentially affected queries
      void queryClient.invalidateQueries({ queryKey: ['card-pool-decks', id], exact: false });
      void queryClient.invalidateQueries({ queryKey: ['deck', deckId] });
    },
  });
};

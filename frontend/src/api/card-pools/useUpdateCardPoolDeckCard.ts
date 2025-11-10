import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';

export type CardLocation = 'pool' | 'deck' | 'trash';

export interface UpdateCardPoolDeckCardBody {
  cardPoolNumber: number;
  location: CardLocation;
}

export interface UpdateCardPoolDeckCardResponse {
  data: {
    deckId: string;
    cardPoolNumber: number;
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['card-pool-decks', id], exact: false });
      void queryClient.invalidateQueries({ queryKey: ['deck', deckId] });
    },
  });
};

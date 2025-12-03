import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { Deck } from '../../../../types/Deck.ts';
import { Visibility } from '../../../../shared/types/visibility.ts';

export interface UpdateCardPoolDeckBody {
  name?: string;
  description?: string;
  visibility?: Visibility;
}

export interface UpdateCardPoolDeckResponse {
  data: { deck: Deck };
}

export const useUpdateCardPoolDeck = (
  id: string | undefined | null,
  deckId: string | undefined,
) => {
  const queryClient = useQueryClient();

  return useMutation<UpdateCardPoolDeckResponse, Error, UpdateCardPoolDeckBody>({
    mutationFn: async body => {
      if (!id || !deckId) throw new Error('Card pool id and deck id are required');
      const res = await api['card-pools'][':id'].decks[':deckId'].$patch({
        param: { id, deckId },
        json: body,
      });
      if (!res.ok) {
        throw new Error('Failed to update card pool deck');
      }
      return (await res.json()) as UpdateCardPoolDeckResponse;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['card-pool-decks', id], exact: false });
      void queryClient.invalidateQueries({ queryKey: ['deck', deckId] });
    },
  });
};

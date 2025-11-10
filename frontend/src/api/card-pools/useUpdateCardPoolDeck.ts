import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';

export interface UpdateCardPoolDeckBody {
  name?: string;
  description?: string;
  public?: 0 | 1;
}

export interface UpdateCardPoolDeckResponse {
  data: any;
}

export const useUpdateCardPoolDeck = (id: string | undefined, deckId: string | undefined) => {
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

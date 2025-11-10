import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';

export const useDeleteCardPoolDeck = (id: string | undefined, deckId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation<boolean, Error, void>({
    mutationFn: async () => {
      if (!id || !deckId) throw new Error('Card pool id and deck id are required');
      const res = await api['card-pools'][':id'].decks[':deckId'].$delete({
        param: { id, deckId },
      });
      if (!res.ok && res.status !== 204) {
        throw new Error('Failed to remove deck from card pool');
      }
      return true;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['card-pool-decks', id], exact: false });
      void queryClient.invalidateQueries({ queryKey: ['deck', deckId] });
      void queryClient.invalidateQueries({ queryKey: ['decks'], exact: false });
    },
  });
};

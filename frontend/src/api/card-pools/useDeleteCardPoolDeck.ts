import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createApiError } from '@/api/errors.ts';
import { applyDeletedDeckCaches } from '@/api/decks/deckDeletionCache.ts';
import { api } from '@/lib/api.ts';

export const useDeleteCardPoolDeck = (
  id: string | undefined | null,
  deckId: string | undefined,
) => {
  const queryClient = useQueryClient();

  return useMutation<boolean, Error, void>({
    mutationFn: async () => {
      if (!id || !deckId) throw new Error('Card pool id and deck id are required');
      const res = await api['card-pools'][':id'].decks[':deckId'].$delete({
        param: { id, deckId },
      });
      if (!res.ok) {
        throw await createApiError(res, 'Failed to remove deck from card pool');
      }
      return true;
    },
    onSuccess: () => {
      applyDeletedDeckCaches(queryClient, [deckId!], [id!]);
    },
  });
};

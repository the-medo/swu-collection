import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { toast } from '@/hooks/use-toast.ts';
import { createApiError } from '@/api/errors.ts';
import { applyDeletedDeckCaches } from '@/api/decks/deckDeletionCache.ts';

export { removeDeckFromListCache } from '@/api/decks/deckDeletionCache.ts';

export const useDeleteDeck = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deckId: string) => {
      const response = await api.deck[':id'].$delete({
        param: { id: deckId },
      });
      if (!response.ok) {
        throw await createApiError(response, 'Failed to delete deck');
      }
      return response.json();
    },
    onSuccess: (result, deckId) => {
      applyDeletedDeckCaches(
        queryClient,
        [deckId],
        result.data.cardPoolId ? [result.data.cardPoolId] : [],
      );
    },
    onError: error => {
      toast({
        variant: 'destructive',
        title: 'Error while deleting deck',
        description: error.toString(),
      });
    },
  });
};

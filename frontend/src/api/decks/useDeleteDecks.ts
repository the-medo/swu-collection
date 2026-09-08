import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createApiError } from '@/api/errors.ts';
import { applyBulkDeletedDeckCaches } from '@/api/decks/deckDeletionCache.ts';
import { toast } from '@/hooks/use-toast.ts';
import { api } from '@/lib/api.ts';

export const useDeleteDecks = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deckIds: string[]) => {
      const response = await api.deck['bulk-delete'].$post({ json: { deckIds } });
      if (!response.ok) {
        throw await createApiError(response, 'Failed to delete decks');
      }
      return response.json();
    },
    onSuccess: async result => {
      await applyBulkDeletedDeckCaches(
        queryClient,
        result.data.deletedDeckIds,
        result.data.affectedCardPoolIds,
      );
    },
    onError: error => {
      toast({
        variant: 'destructive',
        title: 'Error while deleting decks',
        description: error.message,
      });
    },
  });
};

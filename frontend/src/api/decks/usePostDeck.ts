import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { toast } from '@/hooks/use-toast.ts';
import { useUser } from '@/hooks/useUser.ts';
import { ZDeckCreateRequest } from '../../../../types/ZDeck.ts';
import { createApiError } from '@/api/errors.ts';
import { deckFolderKeys } from '@/api/deck-folders/queryKeys.ts';

/**
 * Hook to create a new deck.
 */
export const usePostDeck = () => {
  const user = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ZDeckCreateRequest) => {
      if (!user?.id) {
        throw new Error('User id is required');
      }
      const response = await api.deck.$post({
        json: payload,
      });
      if (!response.ok) {
        throw await createApiError(response, 'Failed to create deck');
      }
      const data = await response.json();
      return data;
    },
    onSuccess: () => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ['decks'] }),
        queryClient.invalidateQueries({ queryKey: deckFolderKeys.all }),
      ]);
    },
    onError: error => {
      if ('status' in error && error.status === 404)
        void queryClient.invalidateQueries({ queryKey: deckFolderKeys.all });
      toast({
        variant: 'destructive',
        title: 'Error while creating a deck',
        description: error.message,
      });
    },
  });
};

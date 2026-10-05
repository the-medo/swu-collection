import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { toast } from '@/hooks/use-toast.ts';
import type { ZDeckImportRequest } from '../../../../types/DeckImport.ts';
import { deckFolderKeys } from '@/api/deck-folders/queryKeys.ts';

export const useImportDeck = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ZDeckImportRequest) => {
      const response = await api.deck.import.$post({ json: payload });
      if (!response.ok) throw await createApiError(response, 'Failed to import deck');
      return response.json();
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
        title: 'Error while importing a deck',
        description: (error as Error).message,
      });
    },
  });
};

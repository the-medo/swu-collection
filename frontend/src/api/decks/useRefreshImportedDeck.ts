import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { useUser } from '@/hooks/useUser.ts';
import { refreshDeckAfterWrite } from './deckWriteState.ts';
import { toast } from '@/hooks/use-toast.ts';

export const useRefreshImportedDeck = () => {
  const queryClient = useQueryClient();
  const viewer = useUser();

  return useMutation({
    mutationKey: ['deck-write'],
    mutationFn: async (deckId: string) => {
      const response = await api.deck[':id']['refresh-import'].$post({ param: { id: deckId } });
      if (!response.ok) throw await createApiError(response, 'Failed to refresh imported deck');
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['decks'], exact: false });
    },
    onSettled: (_data, _error, deckId) => refreshDeckAfterWrite(queryClient, deckId, viewer?.id),
    onError: error => {
      toast({
        variant: 'destructive',
        title: 'Unable to refresh imported deck',
        description: (error as Error).message,
      });
    },
  });
};

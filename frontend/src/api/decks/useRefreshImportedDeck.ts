import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { toast } from '@/hooks/use-toast.ts';

export const useRefreshImportedDeck = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deckId: string) => {
      const response = await api.deck[':id']['refresh-import'].$post({ param: { id: deckId } });
      if (!response.ok) throw await createApiError(response, 'Failed to refresh imported deck');
      return response.json();
    },
    onSuccess: (_data, deckId) => {
      void queryClient.invalidateQueries({ queryKey: ['deck', deckId] });
      void queryClient.invalidateQueries({ queryKey: ['deck-content', deckId] });
      void queryClient.invalidateQueries({ queryKey: ['decks'], exact: false });
    },
    onError: error => {
      toast({
        variant: 'destructive',
        title: 'Unable to refresh imported deck',
        description: (error as Error).message,
      });
    },
  });
};

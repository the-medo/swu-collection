import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { toast } from '@/hooks/use-toast.ts';
import type { ZDeckImportRequest } from '../../../../types/DeckImport.ts';

export const useImportDeck = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ZDeckImportRequest) => {
      const response = await api.deck.import.$post({ json: payload });
      if (!response.ok) throw await createApiError(response, 'Failed to import deck');
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['decks'], exact: false });
    },
    onError: error => {
      toast({
        variant: 'destructive',
        title: 'Error while importing a deck',
        description: (error as Error).message,
      });
    },
  });
};

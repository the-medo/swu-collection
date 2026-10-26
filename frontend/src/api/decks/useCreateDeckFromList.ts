import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { deckFolderKeys } from '@/api/deck-folders/queryKeys.ts';
import type { DeckFromListRequest } from '../../../../types/DeckFromList.ts';
import { toast } from '@/hooks/use-toast.ts';

export function useCreateDeckFromList() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: async (payload: DeckFromListRequest) => {
      const response = await api.deck['from-list'].$post({ json: payload });
      if (!response.ok) throw await createApiError(response, 'Could not create the deck.');
      return response.json();
    },
    // Mutation-level callbacks also run if the average-deck editor is closed during the request.
    onSuccess: result => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ['decks'] }),
        queryClient.invalidateQueries({ queryKey: deckFolderKeys.all }),
      ]);
      toast({ title: 'Combined deck created' });
      void navigate({ to: '/decks/$deckId', params: { deckId: result.data.id } });
    },
  });
}

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { deckFolderKeys } from './queryKeys.ts';
import { toast } from '@/hooks/use-toast.ts';
import type { MoveDecksToFolderRequest } from '../../../../types/DeckFolder.ts';

export function useMoveDecksToFolder() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (json: MoveDecksToFolderRequest) => {
      const response = await api['deck-folders'].move.$post({ json });
      if (!response.ok) throw await createApiError(response, 'Failed to move decks');
      return response.json();
    },
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: deckFolderKeys.all }),
        client.invalidateQueries({ queryKey: ['decks'] }),
      ]),
    onError: error =>
      toast({ variant: 'destructive', title: 'Could not move decks', description: error.message }),
  });
}

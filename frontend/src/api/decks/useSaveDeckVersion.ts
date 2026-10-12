import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { useUser } from '@/hooks/useUser.ts';
import { createApiError } from '@/api/errors.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';
import { assertDeckReadyToSave, refreshDeckForSave } from './deckWriteState.ts';
import { toast } from '@/hooks/use-toast.ts';

export const useSaveDeckVersion = (deckId: string) => {
  const queryClient = useQueryClient();
  const viewer = useUser();
  return useMutation({
    mutationKey: ['deck-save', deckId],
    mutationFn: async ({
      changeNote,
      expectedUpdatedAt,
    }: {
      changeNote?: string;
      expectedUpdatedAt: string;
    }) => {
      assertDeckReadyToSave(queryClient, deckId, viewer?.id, expectedUpdatedAt);
      const response = await api.deck[':id'].versions.$post({
        param: { id: deckId },
        json: { changeNote: changeNote || undefined, expectedUpdatedAt },
      });
      if (!response.ok) throw await createApiError(response, 'Unable to save deck version');
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['deck-versions'] });
      void queryClient.invalidateQueries({ queryKey: ['deck-version-diff'] });
      void queryClient.invalidateQueries({ queryKey: ['deck'] });
      void queryClient.invalidateQueries({ queryKey: ['deck-content'] });
      void queryClient.invalidateQueries({ queryKey: ['decks-bulk'] });
      toast({ title: 'Deck version saved' });
    },
    onError: async (error: ErrorWithStatus) => {
      if (error.status === 409) await refreshDeckForSave(queryClient, deckId, viewer?.id);
      toast({
        variant: 'destructive',
        title:
          error.status === 409 ? 'Deck changed since you loaded it' : 'Unable to save deck version',
        description:
          error.status === 409
            ? 'Review the refreshed deck before saving again. If it could not reload, refresh the page first. Your version note is kept.'
            : error.message,
      });
    },
  });
};

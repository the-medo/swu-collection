import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { DeckCardResponse } from './useGetDeckCards.ts';
import { toast } from '@/hooks/use-toast.ts';
import { useUser } from '@/hooks/useUser.ts';
import { deckKeys } from './queryKeys.ts';
import { refreshDeckAfterWrite } from './deckWriteState.ts';

export type DeckCardDeleteData = {
  cardId: string;
  board: number;
};

export const useDeleteDeckCard = (deckId: string | undefined) => {
  const queryClient = useQueryClient();
  const viewer = useUser();

  return useMutation({
    mutationKey: ['deck-write', deckId],
    scope: { id: `deck-write:${deckId}` },
    mutationFn: async (cardData: DeckCardDeleteData) => {
      if (!deckId) {
        throw new Error('Deck id is required');
      }

      const response = await api.deck[':id'].card.$delete({
        param: { id: deckId },
        json: {
          ...cardData,
          deckId, // Adding deckId to match the expected format in ZDeckCardDeleteRequest
        },
      });

      if (!response.ok) {
        throw new Error(
          response.statusText === 'Internal Server Error'
            ? 'Something went wrong while deleting the card'
            : response.statusText,
        );
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['decks'] });
      if (variables.board !== 3) {
        void queryClient.invalidateQueries({ queryKey: ['deck-versions'] });
        void queryClient.invalidateQueries({ queryKey: ['deck-version-diff'] });
      }
      queryClient.setQueryData<DeckCardResponse>(deckKeys.cards(deckId, viewer?.id), oldData => {
        if (!oldData) {
          return { data: [] };
        }

        const { data: existingCards } = oldData;

        const filteredCards = existingCards.filter(
          card => !(card.cardId === variables.cardId && card.board === variables.board),
        );

        toast({
          title: 'Card removed from deck',
        });

        return {
          ...oldData,
          data: filteredCards,
        };
      });
    },
    onSettled: () => (deckId ? refreshDeckAfterWrite(queryClient, deckId, viewer?.id) : undefined),
    onError: error => {
      toast({
        variant: 'destructive',
        title: 'Error while deleting the card',
        description: (error as Error).toString(),
      });
    },
  });
};

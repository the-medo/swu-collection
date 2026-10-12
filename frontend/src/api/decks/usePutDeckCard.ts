import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { toast } from '@/hooks/use-toast.ts';
import { DeckCard } from '../../../../types/ZDeckCard.ts';
import { useUser } from '@/hooks/useUser.ts';
import { refreshDeckAfterWrite, updateDeckCardOptimistically } from './deckWriteState.ts';

export type DeckCardIdentification = {
  cardId: string;
  board: number;
};

export type DeckCardUpdateData = {
  quantity?: number;
  note?: string;
};

type DeckCardUpdateRequest = {
  id: DeckCardIdentification;
  data: DeckCardUpdateData;
};

export const usePutDeckCard = (deckId: string | undefined) => {
  const queryClient = useQueryClient();
  const viewer = useUser();

  return useMutation({
    mutationKey: ['deck-write', deckId],
    scope: { id: `deck-write:${deckId}` },
    // The mutation function updates the card in the deck.
    mutationFn: async (cardData: DeckCardUpdateRequest) => {
      if (!deckId) {
        throw new Error('Deck id is required');
      }

      return updateDeckCardOptimistically(queryClient, deckId, viewer?.id, cardData, async () => {
        const response = await api.deck[':id'].card.$put({
          param: { id: deckId },
          json: {
            id: {
              ...cardData.id,
              deckId, // Adding deckId to match the expected format in ZDeckCardUpdateRequest
            },
            data: cardData.data,
          },
        });

        if (!response.ok) {
          throw new Error(
            response.statusText === 'Internal Server Error'
              ? 'Something went wrong while updating the card'
              : response.statusText,
          );
        }

        return response.json() as unknown as { data: DeckCard };
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['decks'] });

      toast({
        title: `Updated!`,
      });
    },
    onSettled: () => (deckId ? refreshDeckAfterWrite(queryClient, deckId, viewer?.id) : undefined),
    onError: error => {
      toast({
        variant: 'destructive',
        title: 'Error while updating the card',
        description: (error as Error).toString(),
      });
    },
  });
};

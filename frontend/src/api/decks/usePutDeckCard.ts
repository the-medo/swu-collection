import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { DeckCardResponse } from './useGetDeckCards.ts';
import { toast } from '@/hooks/use-toast.ts';
import { DeckCard } from '../../../../types/ZDeckCard.ts';

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

  return useMutation({
    // The mutation function updates the card in the deck.
    mutationFn: async (cardData: DeckCardUpdateRequest) => {
      if (!deckId) {
        throw new Error('Deck id is required');
      }

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
    },
    onSuccess: (result, vars) => {
      queryClient.setQueryData<DeckCardResponse>(['deck-content', deckId], oldData => {
        if (!oldData) {
          return { data: [result.data] };
        }

        const { id } = vars;
        const { data: existingCards } = oldData;

        const cardIndex = existingCards.findIndex(
          (card: DeckCard) => card.cardId === id.cardId && card.board === id.board,
        );

        if (cardIndex >= 0) {
          const updatedCard = result.data;

          toast({
            title: `Updated!`,
          });

          return {
            ...oldData,
            data:
              updatedCard.quantity === 0
                ? [...existingCards.slice(0, cardIndex), ...existingCards.slice(cardIndex + 1)]
                : [
                    ...existingCards.slice(0, cardIndex),
                    updatedCard,
                    ...existingCards.slice(cardIndex + 1),
                  ],
          };
        }

        return {
          ...oldData,
          data: [...existingCards, result.data],
        };
      });
    },
    onError: error => {
      toast({
        variant: 'destructive',
        title: 'Error while updating the card',
        description: (error as Error).toString(),
      });
    },
  });
};

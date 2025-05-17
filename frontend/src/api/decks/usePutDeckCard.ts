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

      queryClient.setQueryData<DeckCardResponse>(['deck-content', deckId], oldData => {
        if (!oldData) {
          return undefined;
        }

        const { id, data: updateRequestData } = cardData;
        const { data: existingCards } = oldData;

        const cardIndex = existingCards.findIndex((card: DeckCard) => {
          return card.cardId === id.cardId && card.board === id.board;
        });

        if (cardIndex >= 0) {
          const updatedCard = { ...existingCards[cardIndex], ...updateRequestData };

          return {
            ...oldData,
            data:
              updateRequestData.quantity === 0
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
          data: [
            ...existingCards,
            {
              deckId,
              cardId: id.cardId,
              board: id.board,
              ...updateRequestData,
            } as DeckCard,
          ],
        };
      });

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
    onSuccess: () => {
      toast({
        title: `Updated!`,
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

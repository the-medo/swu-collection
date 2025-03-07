import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { DeckCardResponse } from './useGetDeckCards.ts';
import { toast } from '@/hooks/use-toast.ts';
import { DeckCard, ZDeckCardCreateRequest } from '../../../../types/ZDeckCard.ts';

export const usePostDeckCard = (deckId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    // The mutation function posts the card to the deck.
    mutationFn: async (cardData: ZDeckCardCreateRequest) => {
      if (!deckId) {
        throw new Error('Deck id is required');
      }

      const response = await api.deck[':id'].card.$post({
        param: { id: deckId },
        json: cardData,
      });

      if (!response.ok) {
        throw new Error(
          response.statusText === 'Internal Server Error'
            ? 'Something went wrong while adding the card'
            : response.statusText,
        );
      }

      return response.json() as unknown as { data: DeckCard };
    },
    // On success, update the cache for the GET query.
    onSuccess: result => {
      // result should be something like { data: newCard }
      queryClient.setQueryData<DeckCardResponse>(['deck-content', deckId], oldData => {
        if (!oldData) {
          return { data: [result.data] };
        }

        const { data: existingCards } = oldData;

        const cardIndex = existingCards.findIndex(
          (card: DeckCard) =>
            card.cardId === result.data.cardId && card.board === result.data.board,
        );

        if (cardIndex >= 0) {
          const updatedCard = {
            ...existingCards[cardIndex],
            quantity: result.data.quantity || 0,
            note: result.data.note ?? existingCards[cardIndex].note,
          } as DeckCard;

          return {
            ...oldData,
            data: [
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

      toast({
        title: 'Card added to deck',
      });
    },
    onError: error => {
      toast({
        variant: 'destructive',
        title: 'Error while adding the card',
        description: (error as Error).toString(),
      });
    },
  });
};

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { DeckCardResponse } from './useGetDeckCards.ts';
import { toast } from '@/hooks/use-toast.ts';

export type DeckCardDeleteData = {
  cardId: string;
  board: number;
};

export const useDeleteDeckCard = (deckId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
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
      queryClient.setQueryData<DeckCardResponse>(
        ['deck-content', deckId],
        oldData => {
          if (!oldData) {
            return { data: [] };
          }

          const { data: existingCards } = oldData;

          const filteredCards = existingCards.filter(
            card => 
              !(card.cardId === variables.cardId && 
                card.board === variables.board)
          );

          toast({
            title: 'Card removed from deck',
          });

          return {
            ...oldData,
            data: filteredCards,
          };
        },
      );
    },
    onError: error => {
      toast({
        variant: 'destructive',
        title: 'Error while deleting the card',
        description: (error as Error).toString(),
      });
    },
  });
};

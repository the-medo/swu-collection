import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { CardLanguage } from '../../../types/enums.ts';
import { CollectionCardResponse } from './useGetCollectionCards.ts';
import { CollectionCard } from '../../../types/CollectionCard.ts';

export type CollectionCardIdentification = {
  cardId: string;
  variantId: string;
  foil: boolean;
  condition: number;
  language: CardLanguage;
};

export type CollectionCardUpdateData = {
  variantId: string;
  foil: boolean;
  condition: number;
  language: CardLanguage;
  amount: number;
  note?: string;
  amount2?: number | null;
  price?: string | null;
};

type CollectionCardUpdateRequest = {
  id: CollectionCardIdentification;
  data: CollectionCardUpdateData;
};

export const usePutCollectionCard = (collectionId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    // The mutation function posts the card to the collection.
    mutationFn: async (cardData: CollectionCardUpdateRequest) => {
      if (!collectionId) {
        throw new Error('Collection id is required');
      }

      const response = await api.collection[':id'].card.$put({
        param: { id: collectionId },
        json: cardData,
      });

      if (!response.ok) {
        throw new Error('Something went wrong while adding the card');
      }

      return response.json() as unknown as { data: CollectionCard };
    },
    onSuccess: (result, vars) => {
      queryClient.setQueryData<CollectionCardResponse>(
        ['collection-content', collectionId],
        oldData => {
          if (!oldData) {
            return { data: [result.data] };
          }

          const { id } = vars;

          const { data: existingCards } = oldData;

          const cardIndex = existingCards.findIndex(
            (card: CollectionCard) =>
              card.cardId === id.cardId &&
              card.variantId === id.variantId &&
              card.foil === id.foil &&
              Number(card.condition) === id.condition &&
              card.language === id.language,
          );

          if (cardIndex >= 0) {
            const updatedCard = result.data;

            return {
              ...oldData,
              data:
                updatedCard.amount === 0 && !updatedCard.amount2
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
        },
      );
    },
  });
};

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { CardLanguage } from '../../../../types/enums.ts';
import { CollectionCard } from '../../../../types/CollectionCard.ts';
import { toast } from '@/hooks/use-toast.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import { useCollectionLayoutStore } from '@/components/app/collections/CollectionContents/CollectionSettings/useCollectionLayoutStore.ts';
import { processCollectionData } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/collectionGroupsLib.ts';
import { useCollectionGroupStoreActions } from '@/components/app/collections/CollectionContents/CollectionGroups/useCollectionGroupStore.ts';
import { CollectionCardResponse } from './useGetCollectionCards.ts';

export type CollectionCardIdentification = {
  cardId: string;
  variantId: string;
  foil: boolean;
  condition: number;
  language: CardLanguage;
};

export const getCollectionCardIdentificationKey = (id: CollectionCardIdentification) => {
  return `${id.cardId}:${id.variantId}:${id.foil}:${id.condition}:${id.language}`;
};

export type CollectionCardUpdateData = {
  variantId?: string;
  foil?: boolean;
  condition?: number;
  language?: CardLanguage;
  amount?: number;
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
  const { data: cardList } = useCardList();
  const { groupBy } = useCollectionLayoutStore();
  const { mergeToCollectionStoreData } = useCollectionGroupStoreActions();

  return useMutation({
    mutationFn: async (cardData: CollectionCardUpdateRequest) => {
      if (!collectionId) {
        throw new Error('Collection id is required');
      }

      if (cardData.data.price === '') {
        cardData.data.price = null;
      }

      const response = await api.collection[':id'].card.$put({
        param: { id: collectionId },
        json: cardData,
      });

      if (!response.ok) {
        throw new Error(
          response.statusText === 'Internal Server Error'
            ? 'Something went wrong while updating the card'
            : response.statusText,
        );
      }

      return response.json() as unknown as { data: CollectionCard };
    },
    onSuccess: (result, vars) => {
      if (!cardList) return;

      toast({
        title: `Updated!`,
      });

      queryClient.setQueryData<CollectionCardResponse>(
        ['collection-content', collectionId],
        oldData => {
          if (!oldData) return;

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

            toast({
              title: `Updated!`,
            });

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

      const updatedCards = [result.data];
      const processedData = processCollectionData(updatedCards, cardList, groupBy);
      mergeToCollectionStoreData(processedData);
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

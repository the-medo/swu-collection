import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { CardLanguage } from '../../../../types/enums.ts';
import { CollectionCard } from '../../../../types/CollectionCard.ts';
import { toast } from '@/hooks/use-toast.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import { useCollectionLayoutStore } from '@/components/app/collections/CollectionContents/CollectionSettings/useCollectionLayoutStore.ts';
import { processCollectionData } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/collectionGroupsLib.ts';
import { useCollectionGroupStoreActions } from '@/components/app/collections/CollectionContents/CollectionGroups/useCollectionGroupStore.ts';
import { CollectionCardResponse } from '@/api/collections/useGetCollectionCards.ts';

export type CardUpdateData = {
  cardId: string;
  variantId: string;
  foil: boolean;
  condition: number;
  language: CardLanguage;
  amount: number;
  note?: string;
  amount2?: number | null;
  price?: string | null;
};

export const usePostCollectionCard = (collectionId: string | undefined) => {
  const queryClient = useQueryClient();
  const { data: cardList } = useCardList();
  const { groupBy } = useCollectionLayoutStore();
  const { mergeToCollectionStoreData } = useCollectionGroupStoreActions();

  return useMutation({
    mutationFn: async (cardData: CardUpdateData) => {
      if (!collectionId) {
        throw new Error('Collection id is required');
      }

      const response = await api.collection[':id'].card.$post({
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
    onSuccess: result => {
      toast({
        title: `Card added!`,
      });
      if (!cardList) return;

      queryClient.setQueryData<CollectionCardResponse>(
        ['collection-content', collectionId],
        oldData => {
          if (!oldData) return;

          const { data: existingCards } = oldData;

          const cardIndex = existingCards.findIndex(
            (card: CollectionCard) =>
              card.cardId === result.data.cardId &&
              card.variantId === result.data.variantId &&
              card.foil === result.data.foil &&
              card.condition === result.data.condition &&
              card.language === result.data.language,
          );

          if (cardIndex >= 0) {
            const updatedCard = {
              ...existingCards[cardIndex],
              amount: (existingCards[cardIndex].amount || 0) + (result.data.amount || 0),
              amount2: (existingCards[cardIndex].amount2 || 0) + (result.data.amount2 || 0),
              note: result.data.note ?? existingCards[cardIndex].note,
              price: result.data.price ?? existingCards[cardIndex].price,
            } as CollectionCard;

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
        },
      );

      const newCards = [result.data];
      const processedData = processCollectionData(newCards, cardList, groupBy);
      mergeToCollectionStoreData(processedData);
    },
    onError: error => {
      toast({
        variant: 'destructive',
        title: 'Error while inserting the card',
        description: (error as Error).toString(),
      });
    },
  });
};

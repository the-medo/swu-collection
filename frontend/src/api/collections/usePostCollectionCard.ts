import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import type { CardLanguage } from '../../../../types/enums.ts';
import type { CollectionCard } from '../../../../types/CollectionCard.ts';
import { toast } from '@/hooks/use-toast.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import { useCollectionLayoutStore } from '@/components/app/collections/CollectionContents/CollectionSettings/useCollectionLayoutStore.ts';
import { processCollectionData } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/collectionGroupsLib.ts';
import { useCollectionGroupStoreActions } from '@/components/app/collections/CollectionContents/CollectionGroups/useCollectionGroupStore.ts';
import type { CollectionCardResponse } from '@/api/collections/useGetCollectionCards.ts';
import { createApiError } from '@/api/errors.ts';
import { useUser } from '@/hooks/useUser.ts';
import { cardInListsQueryKeys } from './cardInListsQueryKeys.ts';

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
  const user = useUser();
  const { data: cardList } = useCardList();
  const { groupBy } = useCollectionLayoutStore();
  const { mergeToCollectionStoreData } = useCollectionGroupStoreActions();

  return useMutation({
    mutationKey: ['collection-card', user?.id, collectionId, 'add'],
    scope: collectionId ? { id: `collection-card:${collectionId}` } : undefined,
    mutationFn: async (cardData: CardUpdateData) => {
      if (!collectionId) {
        throw new Error('Collection id is required');
      }

      const response = await api.collection[':id'].card.$post({
        param: { id: collectionId },
        json: cardData,
      });

      if (!response.ok) {
        throw await createApiError(response, 'Something went wrong while adding the card');
      }

      return response.json() as unknown as { data: CollectionCard };
    },
    onSuccess: result => {
      toast({
        title: `Card added!`,
      });

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
            return {
              ...oldData,
              data: [
                ...existingCards.slice(0, cardIndex),
                result.data,
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

      if (cardList) {
        const processedData = processCollectionData([result.data], cardList, groupBy);
        mergeToCollectionStoreData(processedData, collectionId);
      }

      // The sync refresh also updates the persistent rows and deck ownership totals.
      void queryClient.invalidateQueries({ queryKey: ['user-collections-sync'] });
      void queryClient.invalidateQueries({ queryKey: ['collection', collectionId] });
      void queryClient.invalidateQueries({ queryKey: cardInListsQueryKeys.all });
      if (user) {
        void queryClient.invalidateQueries({
          queryKey: ['collections', user.id],
          refetchType: 'none',
        });
      }
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

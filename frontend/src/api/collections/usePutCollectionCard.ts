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
import { createApiError } from '@/api/errors.ts';
import { useUser } from '@/hooks/useUser.ts';
import { cardInListsQueryKeys } from './cardInListsQueryKeys.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';
import type {
  CollectionCardLookupResponse,
  CollectionCardLookupRow,
} from '../../../../shared/types/CollectionCardLookup.ts';

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

export const usePutCollectionCard = (
  collectionId: string | undefined,
  options?: { setAmount?: boolean },
) => {
  const queryClient = useQueryClient();
  const user = useUser();
  const { data: cardList } = useCardList();
  const { groupBy } = useCollectionLayoutStore();
  const { mergeToCollectionStoreData, forceRefreshCollectionGroupStore } =
    useCollectionGroupStoreActions();

  return useMutation({
    mutationKey: ['collection-card', user?.id, collectionId, 'update'],
    // Keep single-card writes in order across the collection page and card-detail tables.
    scope: collectionId ? { id: `collection-card:${collectionId}` } : undefined,
    mutationFn: async (cardData: CollectionCardUpdateRequest) => {
      if (!collectionId) {
        throw new Error('Collection id is required');
      }

      if (cardData.data.price === '') {
        cardData.data.price = null;
      }

      if (options?.setAmount && cardData.data.amount === undefined) {
        throw new Error('An exact quantity is required');
      }
      const response = options?.setAmount
        ? await api.collection[':id'].card.amount.$put({
            param: { id: collectionId },
            json: { id: cardData.id, amount: cardData.data.amount! },
          })
        : await api.collection[':id'].card.$put({
            param: { id: collectionId },
            json: cardData,
          });

      if (!response.ok) {
        throw await createApiError(response, 'Something went wrong while updating the card');
      }

      const result = (await response.json()) as unknown as { data?: CollectionCard };
      if (!result.data) {
        const error = new Error('This card is no longer in this list.') as Error & ErrorWithStatus;
        error.status = 404;
        throw error;
      }
      return { data: result.data };
    },
    onSuccess: async (result, vars) => {
      const contentKey = ['collection-content', collectionId];
      const wasFetchingContents = queryClient.isFetching({ queryKey: contentKey, exact: true }) > 0;
      // A gallery opened during this save may still be reading the old database contents.
      // Discard that response before applying the authoritative saved row.
      await queryClient.cancelQueries({ queryKey: contentKey, exact: true });
      if (user) {
        const savedRow = result.data as unknown as CollectionCardLookupRow;
        queryClient.setQueryData<CollectionCardLookupResponse>(
          cardInListsQueryKeys.card(user.id, vars.id.cardId),
          oldData => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              data: oldData.data
                .map(list => {
                  if (list.collection.id !== collectionId) return list;
                  const matches = (row: CollectionCardLookupRow) =>
                    row.cardId === vars.id.cardId &&
                    row.variantId === vars.id.variantId &&
                    row.foil === vars.id.foil &&
                    row.condition === vars.id.condition &&
                    row.language === vars.id.language;
                  return {
                    ...list,
                    cards:
                      savedRow.amount === 0 && !savedRow.amount2
                        ? list.cards.filter(row => !matches(row))
                        : list.cards.map(row => (matches(row) ? savedRow : row)),
                  };
                })
                .filter(list => list.cards.length > 0),
            };
          },
        );
      }
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

          if (result.data.amount === 0 && !result.data.amount2) return oldData;

          return {
            ...oldData,
            data: [...existingCards, result.data],
          };
        },
      );

      // Finish any interrupted full-list refresh using data read after this save.
      if (wasFetchingContents || !queryClient.getQueryData(contentKey)) {
        void queryClient.invalidateQueries({ queryKey: contentKey, exact: true });
      }

      if (cardList) {
        if (result.data.amount === 0 && !result.data.amount2) {
          forceRefreshCollectionGroupStore(collectionId);
        } else {
          const processedData = processCollectionData([result.data], cardList, groupBy);
          mergeToCollectionStoreData(processedData, collectionId);
        }
      }
      void queryClient.invalidateQueries({ queryKey: cardInListsQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['user-collections-sync'] });
      void queryClient.invalidateQueries({ queryKey: ['collection', collectionId] });
      if (user) {
        void queryClient.invalidateQueries({
          queryKey: ['collections', user.id],
          refetchType: 'none',
        });
      }
    },
    onError: error => {
      if ((error as Error & ErrorWithStatus).status === 404) {
        void queryClient.invalidateQueries({ queryKey: cardInListsQueryKeys.all });
        void queryClient.invalidateQueries({ queryKey: ['collection-content', collectionId] });
        void queryClient.invalidateQueries({ queryKey: ['collection', collectionId] });
        void queryClient.invalidateQueries({ queryKey: ['user-collections-sync'] });
        forceRefreshCollectionGroupStore(collectionId);
      }
      toast({
        variant: 'destructive',
        title: 'Error while updating the card',
        description: (error as Error).toString(),
      });
    },
  });
};

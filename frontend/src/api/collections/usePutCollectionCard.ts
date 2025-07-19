import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { CardLanguage } from '../../../../types/enums.ts';
import { CollectionCard } from '../../../../types/CollectionCard.ts';
import { toast } from '@/hooks/use-toast.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import { useCollectionLayoutStore } from '@/components/app/collections/CollectionContents/CollectionSettings/useCollectionLayoutStore.ts';
import { processCollectionData } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/collectionGroupsLib.ts';
import { useCollectionGroupStoreActions } from '@/components/app/collections/CollectionContents/CollectionGroups/useCollectionGroupStore.ts';

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
  const { data: cardList } = useCardList();
  const { groupBy } = useCollectionLayoutStore();
  const { mergeToCollectionStoreData } = useCollectionGroupStoreActions();

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
        throw new Error(
          response.statusText === 'Internal Server Error'
            ? 'Something went wrong while updating the card'
            : response.statusText,
        );
      }

      return response.json() as unknown as { data: CollectionCard };
    },
    onSuccess: result => {
      // Show success toast
      toast({
        title: `Updated!`,
      });

      // Only proceed if we have the card list data
      if (!cardList) return;

      // Create an array with just the updated card
      const updatedCards = [result.data];

      // Process the updated card data
      const processedData = processCollectionData(updatedCards, cardList, groupBy);

      // Update the store with the processed data
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

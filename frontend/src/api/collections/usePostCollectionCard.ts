import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { CardLanguage } from '../../../../types/enums.ts';
import { CollectionCard } from '../../../../types/CollectionCard.ts';
import { toast } from '@/hooks/use-toast.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import { useCollectionLayoutStore } from '@/components/app/collections/CollectionContents/CollectionSettings/useCollectionLayoutStore.ts';
import { processCollectionData } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/collectionGroupsLib.ts';
import { useCollectionGroupStoreActions } from '@/components/app/collections/CollectionContents/CollectionGroups/useCollectionGroupStore.ts';

// Define the shape of the card data you're sending to the POST endpoint.
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
  // Get card list data
  const { data: cardList } = useCardList();

  // Get collection layout settings
  const { groupBy } = useCollectionLayoutStore();

  // Get store actions
  const { mergeToCollectionStoreData } = useCollectionGroupStoreActions();

  return useMutation({
    // The mutation function posts the card to the collection.
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
      // Show success toast
      toast({
        title: `Card added!`,
      });

      // Only proceed if we have the card list data
      if (!cardList) return;

      // Create an array with just the new card
      const newCards = [result.data];

      // Process the new card data
      const processedData = processCollectionData(newCards, cardList, groupBy);

      // Update the store with the processed data
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

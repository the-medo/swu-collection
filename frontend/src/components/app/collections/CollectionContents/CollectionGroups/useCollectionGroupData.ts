import { useEffect } from 'react';
import { useGetCollectionCards } from '@/api/collections/useGetCollectionCards.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import { useCollectionLayoutStore } from '@/components/app/collections/CollectionContents/CollectionSettings/useCollectionLayoutStore.ts';
import { processCollectionData } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/collectionGroupsLib.ts';
import { useCollectionGroupStoreActions } from '@/components/app/collections/CollectionContents/CollectionGroups/useCollectionGroupStore.ts';
import { CollectionCard } from '../../../../../../../types/CollectionCard.ts';

/**
 * Hook to fetch, process, and store collection group data
 * @param collectionId The ID of the collection to fetch data for
 */
export function useCollectionGroupData(collectionId: string | undefined) {
  // Get collection cards data
  const { data: collectionCardsData, isLoading: isLoadingCards } =
    useGetCollectionCards(collectionId);

  // Get card list data
  const { data: cardList, isFetching: isFetchingCardList } = useCardList();

  // Get layout settings
  const { groupBy, sortBy } = useCollectionLayoutStore();

  // Get store actions
  const { setLoading, setCollectionStoreData } = useCollectionGroupStoreActions();

  // Process data when collection cards, card list, or layout settings change
  useEffect(() => {
    if (!collectionId || !collectionCardsData || !cardList) return;

    // Set loading state to true
    setLoading(true);

    // Get collection cards
    const cards = collectionCardsData.data as CollectionCard[];

    // Process the data in a setTimeout to avoid blocking the UI
    const handle = setTimeout(() => {
      try {
        // Process collection data using the extracted function
        const processedData = processCollectionData(cards, cardList, groupBy);

        // Set the processed data to the store
        setCollectionStoreData(processedData);

        console.log(processedData);
      } finally {
        // Set loading state to false
        setLoading(false);
      }
    }, 0);

    return () => clearTimeout(handle);
  }, [
    collectionId,
    // collectionCardsData,
    cardList,
    groupBy,
    sortBy,
    setLoading,
    setCollectionStoreData,
  ]);

  return {
    isLoading: isLoadingCards || isFetchingCardList,
  };
}

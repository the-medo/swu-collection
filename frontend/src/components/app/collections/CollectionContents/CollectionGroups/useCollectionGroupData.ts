import { useEffect } from 'react';
import { useGetCollectionCards } from '@/api/collections/useGetCollectionCards.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import { useCollectionLayoutStore } from '@/components/app/collections/CollectionContents/CollectionSettings/useCollectionLayoutStore.ts';
import { processCollectionData } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/collectionGroupsLib.ts';
import {
  useCollectionCards,
  useCollectionGroupStoreActions,
  useCollectionGroupStoreLoadedCollectionId,
} from '@/components/app/collections/CollectionContents/CollectionGroups/useCollectionGroupStore.ts';
import { CollectionCard } from '../../../../../../../types/CollectionCard.ts';

/**
 * Hook to fetch, process, and store collection group data
 * @param collectionId The ID of the collection to fetch data for
 */
export function useCollectionGroupData(collectionId: string | undefined) {
  //Get data from api hook for initial processing
  const { data: collectionCardsData, isLoading: isLoadingCards } =
    useGetCollectionCards(collectionId);

  //Get data from store for additional processings
  const collectionCards = useCollectionCards();

  const { data: cardList, isFetching: isFetchingCardList } = useCardList();
  const { groupBy, sortBy } = useCollectionLayoutStore();
  const { setLoading, setLoadedCollectionId, setCollectionStoreData } =
    useCollectionGroupStoreActions();
  const loadedCollectionId = useCollectionGroupStoreLoadedCollectionId();

  /**
   * This is the initial load - here we use data directly from API hook useGetCollectionCards
   * Data is processed and saved into store.
   * This process should run only once.
   */
  useEffect(() => {
    if (!collectionId || !collectionCardsData || !cardList) return;
    setLoading(true);
    const cards = collectionCardsData.data as CollectionCard[];

    const handle = setTimeout(() => {
      try {
        const processedData = processCollectionData(cards, cardList, []);
        setCollectionStoreData(processedData);
      } finally {
        setLoading(false);
        setLoadedCollectionId(collectionId);
      }
    }, 0);

    return () => clearTimeout(handle);
  }, [
    collectionId,
    collectionCardsData,
    cardList,
    setLoading,
    setLoadedCollectionId,
    setCollectionStoreData,
  ]);

  // Process data when collection cards, card list, or layout settings change
  useEffect(() => {
    if (!collectionId || !cardList) return;
    if (loadedCollectionId !== collectionId) return;
    setLoading(true);

    const cards = Object.values(collectionCards).map(cc => cc.collectionCard);

    const handle = setTimeout(() => {
      try {
        const processedData = processCollectionData(cards, cardList, groupBy);
        console.log({ cards, processedData });

        setCollectionStoreData(processedData);

        console.log(processedData);
      } finally {
        setLoading(false);
      }
    }, 0);

    return () => clearTimeout(handle);
  }, [
    loadedCollectionId,
    collectionId,
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

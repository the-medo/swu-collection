import { useEffect } from 'react';
import { useCardList } from '@/api/lists/useCardList.ts';
import { useCollectionLayoutStore } from '@/components/app/collections/CollectionContents/CollectionSettings/useCollectionLayoutStore.ts';
import { processCollectionData } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/collectionGroupsLib.ts';
import {
  useCollectionCards,
  useCollectionGroupStoreActions,
  useCollectionGroupStoreLoadedCollectionId,
  useForceRefreshCollectionGroupStore,
} from '@/components/app/collections/CollectionContents/CollectionGroups/useCollectionGroupStore.ts';
import { CollectionCard } from '../../../../../../../types/CollectionCard.ts';
import { api } from '@/lib/api.ts';

/**
 * Hook to fetch, process, and store collection group data
 * @param collectionId The ID of the collection to fetch data for
 */
export function useCollectionGroupData(collectionId: string | undefined) {
  const loadedCollectionId = useCollectionGroupStoreLoadedCollectionId();
  const collectionCards = useCollectionCards();
  const forceRefresh = useForceRefreshCollectionGroupStore();

  const { data: cardList, isFetching: isFetchingCardList } = useCardList();
  const { groupBy, sortBy } = useCollectionLayoutStore();
  const { setLoading, setLoadedCollectionId, setCollectionStoreData } =
    useCollectionGroupStoreActions();

  /**
   * This is the initial load - here we use data directly from API hook useGetCollectionCards
   * Data is processed and saved into store.
   * This process should run only once.
   */
  useEffect(() => {
    if (!collectionId || !cardList) return;
    setLoading(true);

    const handle = setTimeout(async () => {
      try {
        const response = await api.collection[':id'].card.$get({
          param: {
            id: collectionId,
          },
        });
        const { data } = await response.json();
        const cards = data as CollectionCard[];
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
    cardList,
    setLoading,
    setLoadedCollectionId,
    setCollectionStoreData,
    forceRefresh,
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
        setCollectionStoreData(processedData);
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
    isLoading: isFetchingCardList,
  };
}

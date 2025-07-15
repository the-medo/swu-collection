import { useEffect } from 'react';
import { useGetCollectionCards } from '@/api/collections/useGetCollectionCards.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import { useCollectionLayoutStore } from '@/components/app/collections/CollectionContents/CollectionSettings/useCollectionLayoutStore.ts';
import {
  getCardKey,
  groupCardsBy,
  sortCardsBy,
} from '@/components/app/collections/CollectionContents/CollectionGroups/lib/collectionGroupsLib.ts';
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
  const { setLoading, setGroups, setCollectionCards, setGroupCards } =
    useCollectionGroupStoreActions();

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
        // Create a map of card keys to cards
        const cardMap: Record<string, CollectionCard> = {};
        cards.forEach(card => {
          const key = getCardKey(card);
          cardMap[key] = card;
        });

        // Update the store with the card map
        setCollectionCards(cardMap);

        // Process each group level
        let currentCards = [...cards];

        // Process each group level
        for (let depth = 0; depth <= groupBy.length; depth++) {
          const groupByValue = groupBy[depth];

          // Group cards at this level
          const groupData = groupCardsBy(cardList.cards, currentCards, groupByValue);
          console.log({ groupData });

          // If this is the first level, store the group data in the store
          if (depth === 0) {
            setGroups(collectionId, groupData);
          }

          // For each group, store the card keys
          groupData.sortedIds.forEach(groupId => {
            const groupCards = groupData.groups[groupId]?.cards || [];

            // If this is the last level, sort the cards
            if (depth === groupBy.length - 1) {
              const sortedCards = sortCardsBy(cardList.cards, groupCards, sortBy);
              const sortedCardKeys = sortedCards.map(card => getCardKey(card));
              setGroupCards(groupId, sortedCardKeys);
            } else {
              // Otherwise, just store the card keys
              const cardKeys = groupCards.map(card => getCardKey(card));
              setGroupCards(groupId, cardKeys);
            }
          });

          // If there are more levels, continue with the first group's cards
          if (depth < groupBy.length - 1 && groupData.sortedIds.length > 0) {
            const firstGroupId = groupData.sortedIds[0];
            currentCards = groupData.groups[firstGroupId]?.cards || [];
          }
        }
      } finally {
        // Set loading state to false
        setLoading(false);
      }
    }, 0);

    return () => clearTimeout(handle);
  }, [
    collectionId,
    collectionCardsData,
    cardList,
    groupBy,
    sortBy,
    setLoading,
    setGroups,
    setCollectionCards,
    setGroupCards,
  ]);

  return {
    isLoading: isLoadingCards || isFetchingCardList,
  };
}

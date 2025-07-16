import { useEffect } from 'react';
import { useGetCollectionCards } from '@/api/collections/useGetCollectionCards.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import { useCollectionLayoutStore } from '@/components/app/collections/CollectionContents/CollectionSettings/useCollectionLayoutStore.ts';
import {
  getCardKey,
  groupCardsBy,
} from '@/components/app/collections/CollectionContents/CollectionGroups/lib/collectionGroupsLib.ts';
import {
  CardGroupInfo,
  CardGroupInfoData,
  CollectionCardExtended,
  useCollectionGroupStoreActions,
} from '@/components/app/collections/CollectionContents/CollectionGroups/useCollectionGroupStore.ts';
import { CollectionCard } from '../../../../../../../types/CollectionCard.ts';

export const ROOT_GROUP_ID = 'root';

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
        // Create a map of card keys to cards
        const cardMap: Record<string, CollectionCardExtended> = {};
        const rootCardsArray: string[] = [];
        cards.forEach(collectionCard => {
          const key = getCardKey(collectionCard);
          const card = cardList.cards[collectionCard.cardId];
          cardMap[key] = {
            collectionCard: collectionCard,
            card,
            variant: card?.variants[collectionCard.variantId],
          };
          rootCardsArray.push(key);
        });

        const rootGroup: CardGroupInfoData = {
          id: ROOT_GROUP_ID,
          label: undefined,
          cardCount: cards.length,
          subGroupIds: [],
          level: 0,
        };

        const cardGroupInfo: CardGroupInfo = {
          [ROOT_GROUP_ID]: rootGroup,
        };

        const groupCards: Record<string, string[]> = {
          root: rootCardsArray,
        };

        const groupIdsToProcess = [ROOT_GROUP_ID];

        const processGroup = (groupId: string, c: CollectionCard[] | undefined) => {
          const groupInfo = cardGroupInfo[groupId];
          if (!groupInfo) return;
          if (!c) {
            c =
              groupCards[groupId]?.map(
                collectionCardKey => cardMap[collectionCardKey].collectionCard,
              ) ?? [];
          }
          const groupingFunctionByLevel = groupBy[groupInfo.level];
          if (groupingFunctionByLevel) {
            const subgroups = groupCardsBy(cardList.cards, c, groupingFunctionByLevel);
            // console.log({ subgroups });

            subgroups.sortedIds.forEach(sgId => {
              const newGroupId = `${groupId}_${sgId}`;
              const cardCount = subgroups.groups[sgId]?.cards?.length ?? 0;
              if (cardCount > 0) {
                cardGroupInfo[newGroupId] = {
                  id: newGroupId,
                  label:
                    groupInfo.level > 0
                      ? `${groupInfo.label} - ${subgroups.groups[sgId]?.label}`
                      : subgroups.groups[sgId]?.label,
                  cardCount,
                  subGroupIds: [],
                  level: groupInfo?.level + 1,
                };
                groupInfo.subGroupIds.push(newGroupId);
                groupIdsToProcess.push(newGroupId);
                groupCards[newGroupId] = subgroups.groups[sgId]?.cards?.map(getCardKey) ?? [];
              }
            });
          }
        };

        while (groupIdsToProcess.length > 0) {
          const process = groupIdsToProcess.pop();
          if (process) processGroup(process, process === ROOT_GROUP_ID ? cards : undefined);
        }

        setCollectionStoreData({
          groupInfo: cardGroupInfo,
          collectionCards: cardMap,
          groupCards,
        });

        console.log({ cardGroupInfo, groupCards, cardMap });
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

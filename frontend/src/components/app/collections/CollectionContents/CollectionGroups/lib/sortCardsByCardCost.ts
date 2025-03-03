import type { CardList } from '../../../../../../../../lib/swu-resources/types.ts';
import {
  CollectionCardSorter,
  getCollectionCardSorter,
} from '@/components/app/collections/CollectionContents/CollectionGroups/lib/collectionGroupsLib.ts';
import { CollectionSortBy } from '@/components/app/collections/CollectionContents/CollectionSettings/useCollectionLayoutStore.ts';

export const sortCardsByCardCost: CollectionCardSorter = (
  cardList: CardList,
  sorters: CollectionSortBy[],
) => {
  const getCardCostByCardId = (cardId: string) => cardList[cardId]?.cost ?? -1;
  const [currentSorter, ...additionalSorters] = sorters;

  return (cardA, cardB) => {
    const v1 = getCardCostByCardId(cardA.cardId);
    const v2 = getCardCostByCardId(cardB.cardId);
    if (v1 !== v2) return v1 - v2;
    if (sorters.length === 0) return 0;
    return getCollectionCardSorter(currentSorter)(cardList, additionalSorters)(cardA, cardB);
  };
};

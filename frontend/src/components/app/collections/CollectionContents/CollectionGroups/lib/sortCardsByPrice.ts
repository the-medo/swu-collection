import {
  CollectionCardSorter,
  getCollectionCardSorter,
} from '@/components/app/collections/CollectionContents/CollectionGroups/lib/collectionGroupsLib.ts';
import type { CardList } from '../../../../../../../../lib/swu-resources/types.ts';
import { CollectionSortBy } from '@/components/app/collections/CollectionContents/CollectionSettings/useCollectionLayoutStore.ts';

export const sortCardsByPrice: CollectionCardSorter = (
  cardList: CardList,
  sorters: CollectionSortBy[],
) => {
  const [currentSorter, ...additionalSorters] = sorters;

  return (cardA, cardB) => {
    const compared = (cardB.price ?? -1) - (cardA.price ?? -1);
    if (compared !== 0) return compared;
    if (sorters.length === 0) return 0;
    return getCollectionCardSorter(currentSorter)(cardList, additionalSorters)(cardA, cardB);
  };
};

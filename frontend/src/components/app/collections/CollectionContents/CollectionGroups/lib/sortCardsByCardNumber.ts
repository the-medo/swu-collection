import {
  CollectionCardSorter,
  getCollectionCardSorter,
} from '@/components/app/collections/CollectionContents/CollectionGroups/lib/collectionGroupsLib.ts';
import type { CardList } from '../../../../../../../../lib/swu-resources/types.ts';
import { CollectionSortBy } from '@/components/app/collections/CollectionContents/CollectionSettings/useCollectionLayoutStore.ts';

export const sortCardsByCardNumber: CollectionCardSorter = (
  cardList: CardList,
  sorters: CollectionSortBy[],
) => {
  const getCardNumber = (cardId: string, variantId: string) =>
    cardList[cardId]?.variants[variantId]?.cardNo ?? 1000;
  const [currentSorter, ...additionalSorters] = sorters;

  return (cardA, cardB) => {
    const compared =
      getCardNumber(cardA.cardId, cardA.variantId) - getCardNumber(cardB.cardId, cardB.variantId);
    if (compared !== 0) return compared;
    if (sorters.length === 0) return 0;
    return getCollectionCardSorter(currentSorter)(cardList, additionalSorters)(cardA, cardB);
  };
};

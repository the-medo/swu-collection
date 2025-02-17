import type { CardList } from '../../../../../../../../lib/swu-resources/types.ts';
import {
  CollectionCardSorter,
  getCollectionCardSorter,
} from '@/components/app/collections/CollectionContents/CollectionGroups/lib/collectionGroupsLib.ts';
import { CollectionSortBy } from '@/components/app/collections/CollectionContents/CollectionSettings/useCollectionLayoutStore.ts';
import { SwuRarity } from '../../../../../../../../types/enums.ts';

export const raritySortValues = {
  [SwuRarity.COMMON]: 40,
  [SwuRarity.UNCOMMON]: 30,
  [SwuRarity.SPECIAL]: 20,
  [SwuRarity.RARE]: 10,
  [SwuRarity.LEGENDARY]: 0,
};

export const sortCardsByCardRarity: CollectionCardSorter = (
  cardList: CardList,
  sorters: CollectionSortBy[],
) => {
  const getCardRaritySortValue = (cardId: string) =>
    raritySortValues[cardList[cardId]?.rarity ?? SwuRarity.COMMON];
  const [currentSorter, ...additionalSorters] = sorters;

  return (cardA, cardB) => {
    const v1 = getCardRaritySortValue(cardA.cardId);
    const v2 = getCardRaritySortValue(cardB.cardId);
    if (v1 !== v2) return v1 - v2;
    if (sorters.length === 0) return 0;
    return getCollectionCardSorter(currentSorter)(cardList, additionalSorters)(cardA, cardB);
  };
};

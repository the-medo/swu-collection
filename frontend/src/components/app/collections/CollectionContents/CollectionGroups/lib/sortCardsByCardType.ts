import type { CardList } from '../../../../../../../../lib/swu-resources/types.ts';
import {
  CollectionCardSorter,
  getCollectionCardSorter,
} from '@/components/app/collections/CollectionContents/CollectionGroups/lib/collectionGroupsLib.ts';
import { CollectionSortBy } from '@/components/app/collections/CollectionContents/CollectionSettings/useCollectionLayoutStore.ts';

export const cardTypeSortValues: Record<string, number> = {
  Leader: 0,
  Base: 10,
  UnitGround: 20,
  UnitSpace: 30,
  Event: 40,
  Upgrade: 50,
  Unknown: 60,
};

export const sortCardsByCardType: CollectionCardSorter = (
  cardList: CardList,
  sorters: CollectionSortBy[],
) => {
  const getCardTypeSortValue = (cardId: string) => {
    const t = cardList[cardId]?.type;
    if (t === 'Unit') {
      return cardList[cardId]?.arenas[0] === 'Space'
        ? cardTypeSortValues.UnitSpace
        : cardTypeSortValues.UnitGround;
    }
    return cardTypeSortValues[t ?? 'Unknown'] ?? cardTypeSortValues.Unknown;
  };
  const [currentSorter, ...additionalSorters] = sorters;

  return (cardA, cardB) => {
    const v1 = getCardTypeSortValue(cardA.cardId);
    const v2 = getCardTypeSortValue(cardB.cardId);
    if (v1 !== v2) return v1 - v2;
    if (sorters.length === 0) return 0;
    return getCollectionCardSorter(currentSorter)(cardList, additionalSorters)(cardA, cardB);
  };
};

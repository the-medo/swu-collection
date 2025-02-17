import type { CardList } from '../../../../../../../../lib/swu-resources/types.ts';
import {
  CollectionCardSorter,
  getCollectionCardSorter,
} from '@/components/app/collections/CollectionContents/CollectionGroups/lib/collectionGroupsLib.ts';
import { CollectionSortBy } from '@/components/app/collections/CollectionContents/CollectionSettings/useCollectionLayoutStore.ts';
import { SwuAspect } from '../../../../../../../../types/enums.ts';

export const aspectSortValues: Record<string, number> = {
  [SwuAspect.VIGILANCE]: 1000,
  [SwuAspect.COMMAND]: 2000,
  [SwuAspect.AGGRESSION]: 3000,
  [SwuAspect.CUNNING]: 4000,
  [SwuAspect.HEROISM]: 5000,
  [SwuAspect.VILLAINY]: 6000,
};

const aspects = Object.values(SwuAspect);
aspects.forEach(aspect => {
  aspects.forEach(aspect2 => {
    aspectSortValues[[aspect, aspect2].join(',')] =
      aspectSortValues[aspect] + aspectSortValues[aspect2] / 100;
  });
});
aspectSortValues['NoAspect'] = 7000;

export const sortCardsByCardAspects: CollectionCardSorter = (
  cardList: CardList,
  sorters: CollectionSortBy[],
) => {
  const getCardAspectsSortValue = (cardId: string) => {
    const t = cardList[cardId]?.aspects.join(',') ?? 'NoAspect';
    return aspectSortValues[t] ?? aspectSortValues['NoAspect'];
  };
  const [currentSorter, ...additionalSorters] = sorters;

  return (cardA, cardB) => {
    const v1 = getCardAspectsSortValue(cardA.cardId);
    const v2 = getCardAspectsSortValue(cardB.cardId);
    if (v1 !== v2) return v1 - v2;
    if (sorters.length === 0) return 0;
    return getCollectionCardSorter(currentSorter)(cardList, additionalSorters)(cardA, cardB);
  };
};

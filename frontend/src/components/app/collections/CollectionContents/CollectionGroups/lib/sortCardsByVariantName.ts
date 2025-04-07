import {
  CollectionCardSorter,
  getCollectionCardSorter,
} from '@/components/app/collections/CollectionContents/CollectionGroups/lib/collectionGroupsLib.ts';
import type { CardList } from '../../../../../../../../lib/swu-resources/types.ts';
import { CollectionSortBy } from '@/components/app/collections/CollectionContents/CollectionSettings/useCollectionLayoutStore.ts';
import { variantNameSorter } from '../../../../../../../../server/lib/cards/variants.ts';

export const sortCardsByVariantName: CollectionCardSorter = (
  cardList: CardList,
  sorters: CollectionSortBy[],
) => {
  const getCardVariantName = (cardId: string, variantId: string) =>
    cardList[cardId]?.variants[variantId]?.variantName ?? '';
  const [currentSorter, ...additionalSorters] = sorters;

  return (cardA, cardB) => {
    const compared = variantNameSorter(
      getCardVariantName(cardA.cardId, cardA.variantId),
      getCardVariantName(cardB.cardId, cardB.variantId),
    );
    if (compared !== 0) return compared;
    if (sorters.length === 0) return 0;
    return getCollectionCardSorter(currentSorter)(cardList, additionalSorters)(cardA, cardB);
  };
};

import type { CardList } from '../../../../../../../../lib/swu-resources/types.ts';
import { CollectionCard } from '../../../../../../../../types/CollectionCard.ts';
import {
  CardGroupData,
  CardGroups,
} from '@/components/app/collections/CollectionContents/CollectionGroups/lib/collectionGroupsLib.ts';
import { variantNameSorter } from '@/lib/cards/variants.ts';

export const groupCardsByVersionName = (
  cardList: CardList,
  cards: CollectionCard[],
): CardGroupData => {
  const groups: CardGroups = {};

  cards.forEach(card => {
    const cardVariant = cardList[card.cardId]?.variants[card.variantId];
    if (cardVariant) {
      if (groups[cardVariant.variantName]) {
        groups[cardVariant.variantName]?.cards.push(card);
      } else {
        groups[cardVariant.variantName] = {
          id: cardVariant.variantName,
          label: cardVariant.variantName,
          cards: [card],
        };
      }
    }
  });

  return {
    groups,
    sortedIds: Object.keys(groups).sort(variantNameSorter),
  };
};

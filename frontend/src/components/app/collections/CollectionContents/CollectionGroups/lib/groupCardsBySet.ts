import type { CardList } from '../../../../../../../../lib/swu-resources/types.ts';
import { CollectionCard } from '../../../../../../../../types/CollectionCard.ts';
import {
  CardGroupData,
  CardGroups,
} from '@/components/app/collections/CollectionContents/CollectionGroups/lib/collectionGroupsLib.ts';
import { setArray } from '../../../../../../../../lib/swu-resources/set-info.ts';

export const groupCardsBySet = (cardList: CardList, cards: CollectionCard[]): CardGroupData => {
  const groups: CardGroups = Object.fromEntries(
    setArray
      .sort((a, b) => a.sortValue - b.sortValue)
      .map(s => [
        s.code,
        {
          id: s.code,
          label: s.name,
          cards: [],
        },
      ]),
  );

  cards.forEach(card => {
    const set = cardList[card.cardId]?.variants[card.variantId]?.set?.toString();
    if (set) groups[set]?.cards.push(card);
  });

  return {
    groups,
    sortedIds: ['jtl', 'twi', 'shd', 'sor'],
  };
};

import type { CardList } from '../../../../../../../../lib/swu-resources/types.ts';
import { CollectionCard } from '../../../../../../../../types/CollectionCard.ts';
import {
  CardGroupData,
  CardGroups,
} from '@/components/app/collections/CollectionContents/CollectionGroups/lib/collectionGroupsLib.ts';
import { setArray, setArraySorted } from '../../../../../../../../lib/swu-resources/set-info.ts';

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

  const sortedIds: string[] = [...setArraySorted];

  cards.forEach(card => {
    const set = cardList[card.cardId]?.variants[card.variantId]?.set?.toString();
    if (set) {
      if (groups[set]) {
        groups[set]?.cards.push(card);
      } else {
        if (!groups['other']) {
          groups['other'] = {
            id: 'other',
            label: 'Other',
            cards: [],
          };
          sortedIds.push('other');
        }
        groups['other']?.cards.push(card);
      }
    }
  });

  return {
    groups,
    sortedIds,
  };
};

import type { CardList } from '../../../../../../../../lib/swu-resources/types.ts';
import { CollectionCard } from '../../../../../../../../types/CollectionCard.ts';
import {
  CardGroupData,
  CardGroups,
} from '@/components/app/collections/CollectionContents/CollectionGroups/lib/collectionGroupsLib.ts';

export const groupCardsByCost = (cardList: CardList, cards: CollectionCard[]): CardGroupData => {
  const groups: CardGroups = {
    NoCost: {
      id: 'NoCost',
      label: 'No Cost',
      cards: [],
    },
  };

  cards.forEach(card => {
    const cost = cardList[card.cardId]?.cost ?? null;
    if (cost === null) {
      groups.NoCost?.cards.push(card);
    } else {
      const strCost = cost.toString();
      if (groups[strCost]) {
        groups[strCost]?.cards.push(card);
      } else {
        groups[strCost] = {
          id: strCost,
          label: `${cost} cost`,
          cards: [card],
        };
      }
    }
  });

  return {
    groups,
    sortedIds: Object.keys(groups).sort((a, b) =>
      a.localeCompare(b, 'en', { sensitivity: 'base' }),
    ),
  };
};

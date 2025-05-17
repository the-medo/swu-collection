import type { CardList } from '../../../../../../../../lib/swu-resources/types.ts';
import { DeckCard } from '../../../../../../../../types/ZDeckCard.ts';
import {
  CardGroupData,
  CardGroups,
} from '@/components/app/collections/CollectionContents/CollectionGroups/lib/collectionGroupsLib.ts';

export const groupCardsByCost = (
  cardList: CardList,
  cards: DeckCard[],
): CardGroupData<DeckCard> => {
  const groups: CardGroups<DeckCard> = {
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
    sortedIds: Object.keys(groups).sort((a, b) => {
      if (a === 'NoCost') return 1; // Move NoCost to the end
      if (b === 'NoCost') return -1;
      return parseInt(a) - parseInt(b); // Sort numerically
    }),
  };
};
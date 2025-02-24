import type { CardList } from '../../../../../../../../lib/swu-resources/types.ts';
import { CollectionCard } from '../../../../../../../../types/CollectionCard.ts';
import {
  CardGroupData,
  CardGroups,
} from '@/components/app/collections/CollectionContents/CollectionGroups/lib/collectionGroupsLib.ts';

export const groupCardsBySet = (cardList: CardList, cards: CollectionCard[]): CardGroupData => {
  const groups: CardGroups = {
    jtl: {
      id: 'jtl',
      label: 'Jump to Lightspeed',
      cards: [],
    },
    twi: {
      id: 'twi',
      label: 'Twilight of the Republic',
      cards: [],
    },
    shd: {
      id: 'shd',
      label: 'Shadows of the Galaxy',
      cards: [],
    },
    sor: {
      id: 'sor',
      label: 'Spark of Rebellion',
      cards: [],
    },
  };

  cards.forEach(card => {
    const set = cardList[card.cardId]?.variants[card.variantId]?.set?.toString();
    if (set) groups[set]?.cards.push(card);
  });

  return {
    groups,
    sortedIds: ['jtl', 'twi', 'shd', 'sor'],
  };
};

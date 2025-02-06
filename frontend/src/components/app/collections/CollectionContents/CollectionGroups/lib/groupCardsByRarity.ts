import type { CardList } from '../../../../../../../../lib/swu-resources/types.ts';
import { CollectionCard } from '../../../../../../../../types/CollectionCard.ts';
import {
  CardGroupData,
  CardGroups,
} from '@/components/app/collections/CollectionContents/CollectionGroups/lib/collectionGroupsLib.ts';

export const groupCardsByRarity = (cardList: CardList, cards: CollectionCard[]): CardGroupData => {
  const groups: CardGroups = {
    Legendary: {
      id: 'Legendary',
      label: 'Legendary',
      cards: [],
    },
    Rare: {
      id: 'Rare',
      label: 'Rare',
      cards: [],
    },
    Special: {
      id: 'Special',
      label: 'Special',
      cards: [],
    },
    Uncommon: {
      id: 'Uncommon',
      label: 'Uncommon',
      cards: [],
    },
    Common: {
      id: 'Common',
      label: 'Common',
      cards: [],
    },
  };

  cards.forEach(card => {
    const rarity = cardList[card.cardId]?.rarity;
    if (rarity) groups[rarity]?.cards.push(card);
  });

  return {
    groups,
    sortedIds: ['Legendary', 'Rare', 'Special', 'Uncommon', 'Common'],
  };
};

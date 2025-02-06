import type { CardList } from '../../../../../../../../lib/swu-resources/types.ts';
import { CollectionCard } from '../../../../../../../../types/CollectionCard.ts';
import {
  CardGroupData,
  CardGroups,
} from '@/components/app/collections/CollectionContents/CollectionGroups/lib/collectionGroupsLib.ts';

export const groupCardsByCardType = (
  cardList: CardList,
  cards: CollectionCard[],
): CardGroupData => {
  const groups: CardGroups = {
    Leader: {
      id: 'Leader',
      label: 'Leader',
      cards: [],
      horizontal: true,
    },
    Base: {
      id: 'Base',
      label: 'Base',
      cards: [],
      horizontal: true,
    },

    UnitGround: {
      id: 'UnitGround',
      label: 'Unit - Ground',
      cards: [],
    },
    UnitSpace: {
      id: 'UnitSpace',
      label: 'Unit - Space',
      cards: [],
    },
    Event: {
      id: 'Event',
      label: 'Event',
      cards: [],
    },
    Upgrade: {
      id: 'Upgrade',
      label: 'Upgrade',
      cards: [],
    },
    Unknown: {
      id: 'Unknown',
      label: 'Unknown',
      cards: [],
    },
  };

  cards.forEach(card => {
    const type = cardList[card.cardId]?.type;
    if (type) {
      if (type === 'Unit') {
        const arena = cardList[card.cardId]?.arenas[0];
        if (arena === 'Ground') {
          groups.UnitGround?.cards.push(card);
        } else if (arena === 'Space') {
          groups.UnitSpace?.cards.push(card);
        }
      } else if (groups[type]) {
        groups[type].cards.push(card);
      } else {
        groups.Unknown?.cards.push(card);
      }
    }
  });

  return {
    groups,
    sortedIds: ['Leader', 'Base', 'UnitGround', 'UnitSpace', 'Event', 'Upgrade', 'Unknown'],
  };
};

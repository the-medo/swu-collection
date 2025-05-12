import type { CardList } from '../../../../../../../../lib/swu-resources/types.ts';
import { CollectionCard } from '../../../../../../../../types/CollectionCard.ts';
import {
  CardGroupData,
  CardGroups,
} from '@/components/app/collections/CollectionContents/CollectionGroups/lib/collectionGroupsLib.ts';
import { DeckCard } from '../../../../../../../../types/ZDeckCard.ts';
import { cardTypeLabels } from '../../../../../../../../shared/types/cardTypes.ts';

export const groupCardsByCardType = <T extends CollectionCard | DeckCard = CollectionCard>(
  cardList: CardList,
  cards: T[],
): CardGroupData<T> => {
  const groups: CardGroups<T> = {
    Leader: {
      id: 'Leader',
      label: cardTypeLabels['Leader'],
      cards: [],
      horizontal: true,
    },
    Base: {
      id: 'Base',
      label: cardTypeLabels['Base'],
      cards: [],
      horizontal: true,
    },

    UnitGround: {
      id: 'UnitGround',
      label: cardTypeLabels['UnitGround'],
      cards: [],
    },
    UnitSpace: {
      id: 'UnitSpace',
      label: cardTypeLabels['UnitSpace'],
      cards: [],
    },
    Event: {
      id: 'Event',
      label: cardTypeLabels['Event'],
      cards: [],
    },
    Upgrade: {
      id: 'Upgrade',
      label: cardTypeLabels['Upgrade'],
      cards: [],
    },
    Unknown: {
      id: 'Unknown',
      label: cardTypeLabels['Unknown'],
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

import type { CardList } from '../../../../../../../../lib/swu-resources/types.ts';
import { CollectionCard } from '../../../../../../../../types/CollectionCard.ts';
import {
  CardGroupData,
  CardGroups,
} from '@/components/app/collections/CollectionContents/CollectionGroups/lib/collectionGroupsLib.ts';

export const groupCardsByAspect = (cardList: CardList, cards: CollectionCard[]): CardGroupData => {
  const groups: CardGroups = {
    Vigilance: {
      id: 'Vigilance',
      label: 'Vigilance',
      cards: [],
    },
    Command: {
      id: 'Command',
      label: 'Command',
      cards: [],
    },
    Aggression: {
      id: 'Aggression',
      label: 'Aggression',
      cards: [],
    },
    Cunning: {
      id: 'Cunning',
      label: 'Cunning',
      cards: [],
    },
    Heroism: {
      id: 'Heroism',
      label: 'Heroism',
      cards: [],
    },
    Villainy: {
      id: 'Villainy',
      label: 'Villainy',
      cards: [],
    },
    NoAspect: {
      id: 'NoAspect',
      label: 'No Aspect',
      cards: [],
    },
  };

  cards.forEach(card => {
    const aspects = cardList[card.cardId]?.aspects;
    if (aspects) {
      if (aspects.length === 0) {
        groups.NoAspect?.cards.push(card);
      } else {
        aspects.forEach(a => {
          groups[a]?.cards.push(card);
        });
      }
    }
  });

  return {
    groups,
    sortedIds: ['Vigilance', 'Command', 'Aggression', 'Cunning', 'Heroism', 'Villainy', 'NoAspect'],
  };
};

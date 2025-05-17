import type { CardList } from '../../../../../../../../lib/swu-resources/types.ts';
import { DeckCard } from '../../../../../../../../types/ZDeckCard.ts';
import {
  CardGroupData,
  CardGroups,
} from '@/components/app/collections/CollectionContents/CollectionGroups/lib/collectionGroupsLib.ts';

export const groupCardsByAspect = (
  cardList: CardList,
  cards: DeckCard[],
): CardGroupData<DeckCard> => {
  const groups: CardGroups<DeckCard> = {
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
        // Use the primary aspect (first one) for grouping
        const primaryAspect = aspects[0];
        if (groups[primaryAspect]) {
          groups[primaryAspect]?.cards.push(card);
        } else {
          groups.NoAspect?.cards.push(card);
        }
      }
    } else {
      groups.NoAspect?.cards.push(card);
    }
  });

  return {
    groups,
    sortedIds: ['Vigilance', 'Command', 'Aggression', 'Cunning', 'Heroism', 'Villainy', 'NoAspect'],
  };
};
import type { CardList } from '../../../../../../../../lib/swu-resources/types.ts';
import { CollectionCard } from '../../../../../../../../types/CollectionCard.ts';
import {
  CardGroupData,
  CardGroups,
} from '@/components/app/collections/CollectionContents/CollectionGroups/lib/collectionGroupsLib.ts';

export const groupCardsByAspectHard = (
  cardList: CardList,
  cards: CollectionCard[],
): CardGroupData => {
  const groups: CardGroups = {
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
        const groupName = aspects.join(', ');
        if (groups[groupName]) {
          groups[groupName]?.cards.push(card);
        } else {
          groups[groupName] = {
            id: groupName,
            label: groupName,
            cards: [card],
          };
        }
      }
    }
  });

  return {
    groups,
    sortedIds: [
      ...Object.keys(groups)
        .filter(g => g !== 'NoAspect')
        .sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })),
      'NoAspect',
    ],
  };
};

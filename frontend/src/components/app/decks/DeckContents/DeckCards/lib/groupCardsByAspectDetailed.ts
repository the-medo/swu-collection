import type { CardList } from '../../../../../../../../lib/swu-resources/types.ts';
import { DeckCard } from '../../../../../../../../types/ZDeckCard.ts';
import {
  CardGroupData,
  CardGroups,
} from '@/components/app/collections/CollectionContents/CollectionGroups/lib/collectionGroupsLib.ts';

const NO_ASPECT_GROUP_ID = 'NoAspect';
const aspectSortOrder = ['Vigilance', 'Command', 'Aggression', 'Cunning', 'Heroism', 'Villainy'];

const getDetailedAspectGroupName = (aspects: string[]) =>
  [...aspects].sort((a, b) => {
    const aOrder = aspectSortOrder.indexOf(a);
    const bOrder = aspectSortOrder.indexOf(b);

    if (aOrder === -1 && bOrder === -1) return a.localeCompare(b, 'en', { sensitivity: 'base' });
    if (aOrder === -1) return 1;
    if (bOrder === -1) return -1;
    return aOrder - bOrder;
  }).join(', ');

export const groupCardsByAspectDetailed = (
  cardList: CardList,
  cards: DeckCard[],
): CardGroupData<DeckCard> => {
  const groups: CardGroups<DeckCard> = {
    [NO_ASPECT_GROUP_ID]: {
      id: NO_ASPECT_GROUP_ID,
      label: 'No aspect',
      cards: [],
    },
  };

  cards.forEach(card => {
    const aspects = cardList[card.cardId]?.aspects;

    if (!aspects?.length) {
      groups[NO_ASPECT_GROUP_ID]?.cards.push(card);
      return;
    }

    const groupName = getDetailedAspectGroupName(aspects);
    if (!groups[groupName]) {
      groups[groupName] = {
        id: groupName,
        label: groupName,
        cards: [],
      };
    }

    groups[groupName]?.cards.push(card);
  });

  return {
    groups,
    sortedIds: [
      ...Object.keys(groups)
        .filter(g => g !== NO_ASPECT_GROUP_ID)
        .sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })),
      NO_ASPECT_GROUP_ID,
    ],
  };
};

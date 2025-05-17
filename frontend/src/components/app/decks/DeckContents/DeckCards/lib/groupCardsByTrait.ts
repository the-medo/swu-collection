import type { CardList } from '../../../../../../../../lib/swu-resources/types.ts';
import { DeckCard } from '../../../../../../../../types/ZDeckCard.ts';
import {
  CardGroupData,
  CardGroups,
} from '@/components/app/collections/CollectionContents/CollectionGroups/lib/collectionGroupsLib.ts';

export const groupCardsByTrait = (
  cardList: CardList,
  cards: DeckCard[],
): CardGroupData<DeckCard> => {
  const groups: CardGroups<DeckCard> = {
    NoTrait: {
      id: 'NoTrait',
      label: 'No Trait',
      cards: [],
    },
  };

  // First pass: collect all unique traits
  const allTraits = new Set<string>();
  cards.forEach(card => {
    const traits = cardList[card.cardId]?.traits;
    if (traits && traits.length > 0) {
      traits.forEach(trait => allTraits.add(trait));
    }
  });

  // Create groups for each trait
  allTraits.forEach(trait => {
    groups[trait] = {
      id: trait,
      label: trait,
      cards: [],
    };
  });

  // Second pass: assign cards to groups
  cards.forEach(card => {
    const traits = cardList[card.cardId]?.traits;
    if (traits && traits.length > 0) {
      // Add card to all trait groups it belongs to
      let addedToAnyGroup = false;
      traits.forEach(trait => {
        if (groups[trait]) {
          groups[trait]?.cards.push(card);
          addedToAnyGroup = true;
        }
      });

      // If card wasn't added to any group, add it to NoTrait
      if (!addedToAnyGroup) {
        groups.NoTrait?.cards.push(card);
      }
    } else {
      groups.NoTrait?.cards.push(card);
    }
  });

  // Sort trait IDs by card count in descending order, but keep NoTrait at the end
  const sortedIds = Object.keys(groups)
    .filter(id => id !== 'NoTrait')
    .sort((a, b) => {
      // Sort by card count (descending)
      const countDiff = (groups[b]?.cards.length || 0) - (groups[a]?.cards.length || 0);
      if (countDiff !== 0) return countDiff;

      // If counts are equal, sort alphabetically
      return a.localeCompare(b, 'en', { sensitivity: 'base' });
    });

  // Add NoTrait at the end if it has cards
  if (groups.NoTrait?.cards.length) {
    sortedIds.push('NoTrait');
  }

  return {
    groups,
    sortedIds,
  };
};

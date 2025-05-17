import type { CardList } from '../../../../../../../../lib/swu-resources/types.ts';
import { DeckCard } from '../../../../../../../../types/ZDeckCard.ts';
import {
  CardGroupData,
  CardGroups,
} from '@/components/app/collections/CollectionContents/CollectionGroups/lib/collectionGroupsLib.ts';

export const groupCardsByKeywords = (
  cardList: CardList,
  cards: DeckCard[],
): CardGroupData<DeckCard> => {
  const groups: CardGroups<DeckCard> = {
    NoKeyword: {
      id: 'NoKeyword',
      label: 'No Keyword',
      cards: [],
    },
  };

  // First pass: collect all unique keywords
  const allKeywords = new Set<string>();
  cards.forEach(card => {
    const keywords = cardList[card.cardId]?.keywords;
    if (keywords && keywords.length > 0) {
      keywords.forEach(keyword => allKeywords.add(keyword));
    }
  });

  // Create groups for each keyword
  allKeywords.forEach(keyword => {
    groups[keyword] = {
      id: keyword,
      label: keyword,
      cards: [],
    };
  });

  // Second pass: assign cards to groups
  cards.forEach(card => {
    const keywords = cardList[card.cardId]?.keywords;
    if (keywords && keywords.length > 0) {
      // Add card to all keyword groups it belongs to
      let addedToAnyGroup = false;
      keywords.forEach(keyword => {
        if (groups[keyword]) {
          groups[keyword]?.cards.push(card);
          addedToAnyGroup = true;
        }
      });

      // If card wasn't added to any group, add it to NoKeyword
      if (!addedToAnyGroup) {
        groups.NoKeyword?.cards.push(card);
      }
    } else {
      groups.NoKeyword?.cards.push(card);
    }
  });

  // Sort keyword IDs by card count in descending order, but keep NoKeyword at the end
  const sortedIds = Object.keys(groups)
    .filter(id => id !== 'NoKeyword')
    .sort((a, b) => {
      // Sort by card count (descending)
      const countDiff = (groups[b]?.cards.length || 0) - (groups[a]?.cards.length || 0);
      if (countDiff !== 0) return countDiff;

      // If counts are equal, sort alphabetically
      return a.localeCompare(b, 'en', { sensitivity: 'base' });
    });

  // Add NoKeyword at the end if it has cards
  if (groups.NoKeyword?.cards.length) {
    sortedIds.push('NoKeyword');
  }

  return {
    groups,
    sortedIds,
  };
};

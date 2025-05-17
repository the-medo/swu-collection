import React, { useMemo } from 'react';
import { DeckCardsForLayout } from '@/components/app/decks/DeckContents/DeckCards/deckCardsLib.ts';
import DeckLayoutText from '@/components/app/decks/DeckContents/DeckCards/DeckLayout/DeckLayoutText/DeckLayoutText.tsx';
import { useCardList } from '@/api/lists/useCardList.ts';
import { CardGroupData } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/collectionGroupsLib.ts';
import { DeckCard } from '../../../../../../../types/ZDeckCard.ts';
import { SwuAspect } from '../../../../../../../types/enums.ts';

export type FilterType = 'cost' | 'aspect' | null;

interface DeckStatsSelectedCardsProps {
  deckId: string;
  deckCardsForLayout: DeckCardsForLayout;
  filterType: FilterType;
  filterValue: string | null;
}

const DeckStatsSelectedCards: React.FC<DeckStatsSelectedCardsProps> = ({
  deckId,
  deckCardsForLayout,
  filterType,
  filterValue,
}) => {
  const { data: cardListData } = useCardList();
  const { cardsByBoard } = deckCardsForLayout;

  // Only include mainboard cards (board 1)
  const mainboardCards = cardsByBoard[1];

  const filteredCards = useMemo(() => {
    if (!filterType || !filterValue || !cardListData) {
      return [];
    }

    return mainboardCards.filter(card => {
      const cardData = cardListData.cards[card.cardId];
      if (!cardData) return false;

      if (filterType === 'cost') {
        const cost = cardData.cost !== null ? cardData.cost.toString() : 'X';
        return cost === filterValue;
      } else if (filterType === 'aspect') {
        if (filterValue === 'No Aspect') {
          return !cardData.aspects || cardData.aspects.length === 0;
        }

        // Check if the card has the selected aspect
        return cardData.aspects?.includes(filterValue as SwuAspect);
      }

      return false;
    });
  }, [mainboardCards, filterType, filterValue, cardListData]);

  // Create a modified version of deckCardsForLayout with only the filtered cards
  const filteredDeckCardsForLayout = useMemo(() => {
    if (filteredCards.length === 0) {
      return deckCardsForLayout;
    }

    // Create a simple group for the filtered cards
    const groupName = filterType === 'cost' ? `Cost: ${filterValue}` : `Aspect: ${filterValue}`;

    const mainboardGroups: CardGroupData<DeckCard> = {
      groups: {
        filtered: {
          id: 'filtered',
          label: groupName,
          cards: filteredCards,
        },
      },
      sortedIds: ['filtered'],
    };

    return {
      ...deckCardsForLayout,
      mainboardGroups,
      cardsByBoard: {
        ...deckCardsForLayout.cardsByBoard,
        1: filteredCards,
        2: [], // Empty sideboard
        3: [], // Empty maybeboard
      },
    };
  }, [deckCardsForLayout, filteredCards, filterType, filterValue]);

  if (!filterType || !filterValue) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-muted-foreground">Click on a section in the charts to see cards</p>
      </div>
    );
  }

  if (filteredCards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-muted-foreground">No cards found for the selected filter</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold mb-4">
        {filterType === 'cost'
          ? `Cards with cost ${filterValue}`
          : `Cards with aspect ${filterValue}`}
        <span className="ml-2 text-sm font-normal text-muted-foreground">
          ({filteredCards.length} cards)
        </span>
      </h3>
      <DeckLayoutText
        variant="compact"
        deckId={deckId}
        deckCardsForLayout={filteredDeckCardsForLayout}
        showSideboard={false}
      />
    </div>
  );
};

export default DeckStatsSelectedCards;

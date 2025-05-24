import * as React from 'react';
import { useMemo, useState } from 'react';
import { useComparerStore } from '@/components/app/comparer/useComparerStore.ts';
import { queryClient } from '@/queryClient.ts';
import { DeckCard } from '../../../../../../../types/ZDeckCard.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import { groupCardsByCardType } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/groupCardsByCardType.ts';
import { groupCardsByCost } from '@/components/app/decks/DeckContents/DeckCards/lib/groupCardsByCost.ts';
import { groupCardsByAspect } from '@/components/app/decks/DeckContents/DeckCards/lib/groupCardsByAspect.ts';
import { groupCardsByTrait } from '@/components/app/decks/DeckContents/DeckCards/lib/groupCardsByTrait.ts';
import { groupCardsByKeywords } from '@/components/app/decks/DeckContents/DeckCards/lib/groupCardsByKeywords.ts';
import { DeckGroupBy } from '@/components/app/decks/DeckContents/useDeckLayoutStore.ts';
import { CardComparisonData } from '../types.ts';
import { cn } from '@/lib/utils.ts';
import SectionTitleRow from './ViewRowCard/SectionTitleRow.tsx';
import CardTypeGroup from './ViewRowCard/CardTypeGroup.tsx';

interface DeckComparerResultProps {
  mainDeckId: string;
  otherDeckEntries: ReturnType<typeof useComparerStore>['entries'];
}

/**
 * Component for comparing decks and displaying the comparison results
 */
const DeckComparerResult: React.FC<DeckComparerResultProps> = ({
  mainDeckId,
  otherDeckEntries,
}) => {
  // State for tracking hovered row and column
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [hoveredColumn, setHoveredColumn] = useState<number | null>(null);

  // Get settings from the comparer store
  const { settings } = useComparerStore();

  // Get main deck data and cards from cache
  const mainDeckData = queryClient.getQueryData<any>(['deck', mainDeckId]);
  const mainDeckCards = queryClient.getQueryData<{ data: DeckCard[] }>([
    'deck-content',
    mainDeckId,
  ]);

  // Get card list data
  const { data: cardListData } = useCardList();

  // Create a map of all cards across all decks
  const cardComparisonMap = useMemo(() => {
    const comparisonMap = new Map<string, CardComparisonData>();
    // Track cards by board for the main deck
    const mainDeckCardsByBoard: Record<string, Record<number, number>> = {};

    // Process main deck cards
    if (mainDeckCards?.data && cardListData) {
      // First pass: collect quantities by board
      mainDeckCards.data.forEach(card => {
        if (!mainDeckCardsByBoard[card.cardId]) {
          mainDeckCardsByBoard[card.cardId] = {};
        }
        mainDeckCardsByBoard[card.cardId][card.board] = card.quantity;
      });

      // Second pass: create entries in the map
      mainDeckCards.data.forEach(card => {
        const cardData = cardListData.cards[card.cardId];
        const mapKey = `${card.cardId}-${card.board}`;
        comparisonMap.set(mapKey, {
          cardId: card.cardId,
          mainDeckQuantity: card.quantity,
          otherDecksQuantities: {},
          board: card.board,
          cardType: cardData?.type || 'Unknown',
        });
      });
    }

    // Process other decks' cards
    otherDeckEntries.forEach(entry => {
      const deckId = entry.id;
      const deckCards = queryClient.getQueryData<{ data: DeckCard[] }>(['deck-content', deckId]);

      if (deckCards?.data && cardListData) {
        deckCards.data.forEach(card => {
          const mapKey = `${card.cardId}-${card.board}`;
          const existingCard = comparisonMap.get(mapKey);
          const cardData = cardListData.cards[card.cardId];

          if (existingCard) {
            // Card exists in main deck with the same board, update other deck quantity
            existingCard.otherDecksQuantities[deckId] = card.quantity;
          } else {
            // If the card exists in main deck but in a different board, we still want to add it
            // as a separate entry for the other deck
            comparisonMap.set(mapKey, {
              cardId: card.cardId,
              mainDeckQuantity: 0,
              otherDecksQuantities: { [deckId]: card.quantity },
              board: card.board,
              cardType: cardData?.type || 'Unknown',
            });
          }
        });
      }
    });

    return comparisonMap;
  }, [mainDeckId, mainDeckCards, otherDeckEntries, cardListData]);

  // Convert map to array for rendering
  const cardComparisons = useMemo(() => {
    return Array.from(cardComparisonMap.values());
  }, [cardComparisonMap]);

  // Group cards by board and type
  const groupedCards = useMemo(() => {
    if (!cardListData) return undefined;

    // Create fake DeckCard objects for groupCardsByCardType
    const mainDeckCards = cardComparisons
      .filter(card => card.board === 1)
      .map(card => ({
        cardId: card.cardId,
        board: 1,
        quantity: card.mainDeckQuantity,
        deckId: mainDeckId,
        note: '',
      }));

    const sideboardCards = cardComparisons
      .filter(card => card.board === 2)
      .map(card => ({
        cardId: card.cardId,
        board: 2,
        quantity: card.mainDeckQuantity,
        deckId: mainDeckId,
        note: '',
      }));

    // Select grouping function based on settings
    let mainDeckGroups;
    let sideboardGroups;

    switch (settings.groupBy) {
      case DeckGroupBy.COST:
        mainDeckGroups = groupCardsByCost(cardListData.cards, mainDeckCards);
        sideboardGroups = groupCardsByCost(cardListData.cards, sideboardCards);
        break;
      case DeckGroupBy.ASPECT:
        mainDeckGroups = groupCardsByAspect(cardListData.cards, mainDeckCards);
        sideboardGroups = groupCardsByAspect(cardListData.cards, sideboardCards);
        break;
      case DeckGroupBy.TRAIT:
        mainDeckGroups = groupCardsByTrait(cardListData.cards, mainDeckCards);
        sideboardGroups = groupCardsByTrait(cardListData.cards, sideboardCards);
        break;
      case DeckGroupBy.KEYWORDS:
        mainDeckGroups = groupCardsByKeywords(cardListData.cards, mainDeckCards);
        sideboardGroups = groupCardsByKeywords(cardListData.cards, sideboardCards);
        break;
      case DeckGroupBy.CARD_TYPE:
      default:
        mainDeckGroups = groupCardsByCardType(cardListData.cards, mainDeckCards);
        sideboardGroups = groupCardsByCardType(cardListData.cards, sideboardCards);
        break;
    }

    return {
      mainDeck: mainDeckGroups,
      sideboard: sideboardGroups,
    };
  }, [cardComparisons, cardListData, mainDeckId, settings.groupBy]);

  return (
    <div className="overflow-auto max-h-[80vh]">
      <table className="border-collapse relative">
        <thead className="h-[140px] sticky top-0 z-30 bg-background">
          <tr className="">
            <th
              className="p-2 text-left w-20 sticky left-0 z-30 bg-background"
              onMouseEnter={() => setHoveredColumn(-1)}
              onMouseLeave={() => setHoveredColumn(null)}
            ></th>
            <th
              className="p-2 text-center w-16 relative sticky left-[180px] md:left-[250px] z-10 bg-background"
              onMouseEnter={() => setHoveredColumn(0)}
              onMouseLeave={() => setHoveredColumn(null)}
            >
              <div className="flex items-center">
                <div
                  className={cn(
                    'absolute border-b -rotate-[20deg] bg-accent origin-left whitespace-nowrap transform -translate-x-[60px] -translate-y-[65px] truncate w-[500px] h-[300px] pt-[275px] pl-[20px]',
                  )}
                >
                  {mainDeckData?.deck?.name || ''}
                </div>
              </div>
            </th>
            {otherDeckEntries.map((entry, index) => (
              <th
                key={entry.id}
                className="p-2 text-center w-16 relative"
                onMouseEnter={() => setHoveredColumn(index + 1)}
                onMouseLeave={() => setHoveredColumn(null)}
              >
                <div className="flex items-center">
                  <div
                    className={cn(
                      'absolute -rotate-[20deg] origin-left whitespace-nowrap transform translate-x-4 translate-y-[60px] truncate w-[300px]',
                      {
                        'bg-primary/20': hoveredColumn === index + 1,
                      },
                    )}
                  >
                    {entry.additionalData?.title || 'Other Deck'}
                  </div>
                </div>
              </th>
            ))}
            <th
              className="bg-background"
              onMouseEnter={() => setHoveredColumn(otherDeckEntries.length + 1)}
              onMouseLeave={() => setHoveredColumn(null)}
            ></th>
          </tr>
        </thead>
        <tbody>
          <SectionTitleRow
            title="Main Deck"
            mainDeckId={mainDeckId}
            otherDeckEntries={otherDeckEntries}
            hoveredColumn={hoveredColumn}
            setHoveredColumn={setHoveredColumn}
          />

          {groupedCards?.mainDeck.sortedIds?.map(groupName => {
            const group = groupedCards.mainDeck.groups[groupName];
            if (!group || !group.cards.length) return null;

            // Find the corresponding card comparison data for each card in the group
            const cardsInGroup = group.cards
              .map(card => {
                return cardComparisons.find(c => c.cardId === card.cardId && c.board === 1);
              })
              .filter(Boolean) as CardComparisonData[];

            // Sort cards: first by presence in main deck (cards in main deck first), then by cost
            cardsInGroup.sort((a, b) => {
              // First sort by presence in main deck (cards in main deck first)
              if (a.mainDeckQuantity > 0 && b.mainDeckQuantity === 0) return -1;
              if (a.mainDeckQuantity === 0 && b.mainDeckQuantity > 0) return 1;

              // Then sort by cost
              const costA = cardListData?.cards[a.cardId]?.cost ?? 0;
              const costB = cardListData?.cards[b.cardId]?.cost ?? 0;
              return costA - costB;
            });

            return (
              <CardTypeGroup
                key={groupName}
                groupName={group.label}
                cards={cardsInGroup}
                cardListData={cardListData}
                mainDeckId={mainDeckId}
                otherDeckEntries={otherDeckEntries}
                diffDisplayMode={settings.diffDisplayMode}
                hoveredRow={hoveredRow}
                setHoveredRow={setHoveredRow}
                hoveredColumn={hoveredColumn}
                setHoveredColumn={setHoveredColumn}
              />
            );
          })}

          {/* Sideboard Section */}
          {groupedCards?.sideboard.sortedIds?.some(groupName => {
            const group = groupedCards.sideboard.groups[groupName];
            return group && group.cards.length > 0;
          }) && (
            <>
              <SectionTitleRow
                title="Sideboard"
                mainDeckId={mainDeckId}
                otherDeckEntries={otherDeckEntries}
                hoveredColumn={hoveredColumn}
                setHoveredColumn={setHoveredColumn}
              />

              {groupedCards?.sideboard.sortedIds?.map(groupName => {
                const group = groupedCards.sideboard.groups[groupName];
                if (!group || !group.cards.length) return null;

                // Find the corresponding card comparison data for each card in the group
                const cardsInGroup = group.cards
                  .map(card => {
                    return cardComparisons.find(c => c.cardId === card.cardId && c.board === 2);
                  })
                  .filter(Boolean) as CardComparisonData[];

                // Sort cards: first by presence in main deck (cards in main deck first), then by cost
                cardsInGroup.sort((a, b) => {
                  // First sort by presence in main deck (cards in main deck first)
                  if (a.mainDeckQuantity > 0 && b.mainDeckQuantity === 0) return -1;
                  if (a.mainDeckQuantity === 0 && b.mainDeckQuantity > 0) return 1;

                  // Then sort by cost
                  const costA = cardListData?.cards[a.cardId]?.cost ?? 0;
                  const costB = cardListData?.cards[b.cardId]?.cost ?? 0;
                  return costA - costB;
                });

                return (
                  <CardTypeGroup
                    key={groupName}
                    groupName={group.label}
                    cards={cardsInGroup}
                    cardListData={cardListData}
                    mainDeckId={mainDeckId}
                    otherDeckEntries={otherDeckEntries}
                    diffDisplayMode={settings.diffDisplayMode}
                    hoveredRow={hoveredRow}
                    setHoveredRow={setHoveredRow}
                    hoveredColumn={hoveredColumn}
                    setHoveredColumn={setHoveredColumn}
                  />
                );
              })}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DeckComparerResult;

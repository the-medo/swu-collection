import * as React from 'react';
import { useMemo, useState } from 'react';
import { useComparerStore, DiffDisplayMode } from '@/components/app/comparer/useComparerStore.ts';
import { queryClient } from '@/queryClient.ts';
import { DeckCard } from '../../../../../../../types/ZDeckCard.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import CostIcon from '@/components/app/global/icons/CostIcon.tsx';
import AspectIcon from '@/components/app/global/icons/AspectIcon.tsx';
import { groupCardsByCardType } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/groupCardsByCardType.ts';
import { CardComparisonData } from '../types.ts';
import DeckColumnMenu from './DeckColumnMenu.tsx';
import { cn } from '@/lib/utils.ts';
import DeckCardHoverImage from '@/components/app/decks/DeckContents/DeckCards/DeckLayout/DeckCardHoverImage.tsx';

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

    // Process main deck cards
    if (mainDeckCards?.data && cardListData) {
      mainDeckCards.data.forEach(card => {
        const cardData = cardListData.cards[card.cardId];
        comparisonMap.set(card.cardId, {
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
          const existingCard = comparisonMap.get(card.cardId);
          const cardData = cardListData.cards[card.cardId];

          if (existingCard) {
            // Card exists in main deck, update other deck quantity
            existingCard.otherDecksQuantities[deckId] = card.quantity;
          } else {
            // Card doesn't exist in main deck, add it
            comparisonMap.set(card.cardId, {
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

    const mainDeckGroups = groupCardsByCardType(cardListData.cards, mainDeckCards);
    const sideboardGroups = groupCardsByCardType(cardListData.cards, sideboardCards);

    return {
      mainDeck: mainDeckGroups,
      sideboard: sideboardGroups,
    };
  }, [cardComparisons, cardListData, mainDeckId]);

  // Render quantity difference with color
  const renderQuantityDifference = (mainQty: number, otherQty: number) => {
    const diff = otherQty - mainQty;
    const diffDisplayMode = settings.diffDisplayMode;

    // If there's no difference, just show the quantity
    if (diff === 0) {
      return <span>{otherQty}</span>;
    }

    // Determine text color based on diff
    const textColorClass = diff > 0 ? 'text-green-600' : 'text-red-600';

    // Format the diff with a + sign if positive
    const formattedDiff = diff > 0 ? `+${diff}` : `${diff}`;

    // Render based on display mode
    if (diffDisplayMode === DiffDisplayMode.COUNT_ONLY) {
      return <span className={textColorClass + ' font-medium'}>{otherQty}</span>;
    } else if (diffDisplayMode === DiffDisplayMode.DIFF_ONLY) {
      return <span className={textColorClass + ' font-medium'}>{formattedDiff}</span>;
    } else {
      // Default: COUNT_AND_DIFF
      return (
        <span className={textColorClass + ' font-medium'}>
          {otherQty} <span className="text-xs">({formattedDiff})</span>
        </span>
      );
    }
  };

  // Calculate and render average quantity
  const calculateAndRenderAverage = (card: CardComparisonData) => {
    const quantities = [card.mainDeckQuantity];

    // Add quantities from other decks
    otherDeckEntries.forEach(entry => {
      quantities.push(card.otherDecksQuantities[entry.id] || 0);
    });

    // Calculate average
    const sum = quantities.reduce((acc, qty) => acc + qty, 0);
    const avg = sum / quantities.length;

    // Format to one decimal place if not a whole number
    const formattedAvg = Number.isInteger(avg) ? avg : avg.toFixed(1);

    // Render with the same diff formatter
    const diff = avg - card.mainDeckQuantity;
    const diffDisplayMode = settings.diffDisplayMode;

    // If there's no significant difference, just show the average
    if (Math.abs(diff) < 0.01) {
      return <span>{formattedAvg}</span>;
    }

    // Determine text color based on diff
    const textColorClass = diff > 0 ? 'text-green-600' : 'text-red-600';

    // Format the diff with a + sign if positive
    const formattedDiff = diff > 0 ? `+${diff.toFixed(1)}` : `${diff.toFixed(1)}`;

    // Render based on display mode
    if (diffDisplayMode === DiffDisplayMode.COUNT_ONLY) {
      return <span className={textColorClass + ' font-medium'}>{formattedAvg}</span>;
    } else if (diffDisplayMode === DiffDisplayMode.DIFF_ONLY) {
      return <span className={textColorClass + ' font-medium'}>{formattedDiff}</span>;
    } else {
      // Default: COUNT_AND_DIFF
      return (
        <span className={textColorClass + ' font-medium'}>
          {formattedAvg} <span className="text-xs">({formattedDiff})</span>
        </span>
      );
    }
  };

  // Render card name with cost
  const renderCardName = (cardId: string) => {
    if (!cardListData) return cardId;

    const card = cardListData.cards[cardId];
    if (!card) return cardId;

    const cardContent = (
      <div className="flex items-center justify-between gap-2 max-w-[172px] md:max-w-[242px] overflow-hidden">
        <span className="truncate">{card.name}</span>
        <div className="flex gap-0 ml-1">
          {card.cost !== null ? <CostIcon cost={card.cost} size="xSmall" /> : null}
          {card.aspects?.map((aspect, i) => (
            <AspectIcon key={`${aspect}${i}`} aspect={aspect} size="xSmall" />
          ))}
        </div>
      </div>
    );

    return <DeckCardHoverImage card={card}>{cardContent}</DeckCardHoverImage>;
  };

  // Render a section of cards by type
  const renderCardsByType = (groupName: string, cards: CardComparisonData[]) => {
    if (!cards.length) return null;

    // Calculate total cards for each deck
    const mainDeckTotal = cards.reduce((sum, card) => sum + card.mainDeckQuantity, 0);
    const otherDeckTotals: Record<string, number> = {};

    otherDeckEntries.forEach(entry => {
      otherDeckTotals[entry.id] = cards.reduce(
        (sum, card) => sum + (card.otherDecksQuantities[entry.id] || 0),
        0,
      );
    });

    // Calculate average total for the group
    const allTotals = [mainDeckTotal, ...Object.values(otherDeckTotals)];
    const avgTotal = allTotals.reduce((sum, total) => sum + total, 0) / allTotals.length;
    const formattedAvgTotal = Number.isInteger(avgTotal) ? avgTotal : avgTotal.toFixed(1);

    // Calculate diff for the group total average
    const totalDiff = avgTotal - mainDeckTotal;
    const totalAvgDisplay =
      Math.abs(totalDiff) < 0.01 ? (
        <span>{formattedAvgTotal}</span>
      ) : totalDiff > 0 ? (
        <span className="text-green-600 font-medium">
          {formattedAvgTotal} <span className="text-xs">(+{totalDiff.toFixed(1)})</span>
        </span>
      ) : (
        <span className="text-red-600 font-medium">
          {formattedAvgTotal} <span className="text-xs">({totalDiff.toFixed(1)})</span>
        </span>
      );

    return (
      <React.Fragment key={groupName}>
        <tr
          className="border-t bg-accent"
          onMouseEnter={() => setHoveredRow(`group-${groupName}`)}
          onMouseLeave={() => setHoveredRow(null)}
        >
          <td
            className="p-1 font-medium pt-8 sticky left-0 z-10 bg-accent"
            onMouseEnter={() => setHoveredColumn(-1)}
            onMouseLeave={() => setHoveredColumn(null)}
          >
            {groupName}
          </td>
          <td
            className="text-center text-lg bg-accent font-semibold pt-8 sticky min-w-[55px] left-[180px] md:left-[250px] z-10"
            onMouseEnter={() => setHoveredColumn(0)}
            onMouseLeave={() => setHoveredColumn(null)}
          >
            <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-border"></div>
            {mainDeckTotal}
          </td>
          {otherDeckEntries.map((entry, index) => (
            <td
              key={entry.id}
              className={cn('p-1 text-center w-20 font-semibold pt-8', {
                'bg-accent': hoveredRow === `group-${groupName}` || hoveredColumn === index + 1,
              })}
              onMouseEnter={() => setHoveredColumn(index + 1)}
              onMouseLeave={() => setHoveredColumn(null)}
            >
              {renderQuantityDifference(mainDeckTotal, otherDeckTotals[entry.id])}
            </td>
          ))}
          <td
            className="p-1 text-center w-20 font-semibold pt-8 bg-accent relative"
            onMouseEnter={() => setHoveredColumn(otherDeckEntries.length + 1)}
            onMouseLeave={() => setHoveredColumn(null)}
          >
            <div className="absolute top-0 left-0 bottom-0 w-[2px] bg-border"> </div>
            {totalAvgDisplay}
          </td>
        </tr>
        {cards.map(card => (
          <tr
            key={card.cardId}
            className={cn('border-t', {
              'bg-accent': hoveredRow === card.cardId,
            })}
            onMouseEnter={() => setHoveredRow(card.cardId)}
            onMouseLeave={() => setHoveredRow(null)}
          >
            <td
              className={cn('p-1 sticky left-0 z-10 bg-background', {
                'bg-accent': hoveredRow === card.cardId,
              })}
              onMouseEnter={() => setHoveredColumn(-1)}
              onMouseLeave={() => setHoveredColumn(null)}
            >
              {renderCardName(card.cardId)}
            </td>
            <td
              className="text-center text-lg bg-accent font-semibold sticky left-[180px] md:left-[250px] z-10"
              onMouseEnter={() => setHoveredColumn(0)}
              onMouseLeave={() => setHoveredColumn(null)}
            >
              <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-border"></div>
              {card.mainDeckQuantity}
            </td>
            {otherDeckEntries.map((entry, index) => (
              <td
                key={entry.id}
                className={cn('p-1 text-center min-w-[55px]', {
                  'bg-accent': hoveredRow === card.cardId || hoveredColumn === index + 1,
                })}
                onMouseEnter={() => setHoveredColumn(index + 1)}
                onMouseLeave={() => setHoveredColumn(null)}
              >
                {renderQuantityDifference(
                  card.mainDeckQuantity,
                  card.otherDecksQuantities[entry.id] || 0,
                )}
              </td>
            ))}
            <td
              className="p-1 text-center min-w-[55px] bg-accent relative"
              onMouseEnter={() => setHoveredColumn(otherDeckEntries.length + 1)}
              onMouseLeave={() => setHoveredColumn(null)}
            >
              <div className="absolute top-0 left-0 bottom-0 w-[2px] bg-border"> </div>
              {calculateAndRenderAverage(card)}
            </td>
          </tr>
        ))}
      </React.Fragment>
    );
  };

  const renderSectionTitleRow = (sectionRowTitle: string) => {
    return (
      <tr className="sticky top-[140px] z-50 bg-background">
        <td
          className="font-semibold text-lg sticky left-0 top-[140px] z-50 p-0 bg-background"
          onMouseEnter={() => setHoveredColumn(-1)}
          onMouseLeave={() => setHoveredColumn(null)}
        >
          <div className={cn('h-full w-full flex items-center justify-center bg-primary/20 p-2')}>
            {sectionRowTitle}
          </div>
          <div className="absolute right-0 left-0 bottom-0 h-[2px] bg-border"></div>
        </td>
        <td
          className="text-center sticky left-[180px] md:left-[250px] z-50 p-0 bg-background"
          onMouseEnter={() => setHoveredColumn(0)}
          onMouseLeave={() => setHoveredColumn(null)}
        >
          <div className="h-full w-full flex items-center justify-center bg-primary/20 p-2">
            <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-border"></div>
            <div className="absolute right-0 left-0 bottom-0 h-[2px] bg-border"></div>
            <DeckColumnMenu deckId={mainDeckId} isMainDeck={true} />
          </div>
        </td>

        {otherDeckEntries.map((entry, index) => (
          <td
            key={entry.id}
            className={cn('text-center bg-primary/20 relative', {
              'bg-accent': hoveredColumn === index + 1,
            })}
            onMouseEnter={() => setHoveredColumn(index + 1)}
            onMouseLeave={() => setHoveredColumn(null)}
          >
            <div className="absolute right-0 left-0 bottom-0 h-[2px] bg-border"></div>
            <DeckColumnMenu deckId={entry.id} isMainDeck={false} />
          </td>
        ))}

        <td
          className="text-center bg-accent min-w-[100px] relative"
          onMouseEnter={() => setHoveredColumn(otherDeckEntries.length + 1)}
          onMouseLeave={() => setHoveredColumn(null)}
        >
          <div className="absolute top-0 left-0 bottom-0 w-[2px] bg-border"> </div>
          <div className="absolute right-0 left-0 bottom-0 h-[2px] bg-border"></div>
          <div className="h-full w-full flex items-center justify-center p-2">Avg.</div>
        </td>
      </tr>
    );
  };

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
          {renderSectionTitleRow('Main Deck')}
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

            return renderCardsByType(group.label, cardsInGroup);
          })}

          {/* Sideboard Section */}
          {groupedCards?.sideboard.sortedIds?.some(groupName => {
            const group = groupedCards.sideboard.groups[groupName];
            return group && group.cards.length > 0;
          }) && (
            <>
              {renderSectionTitleRow('Sideboard')}
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

                return renderCardsByType(group.label, cardsInGroup);
              })}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DeckComparerResult;

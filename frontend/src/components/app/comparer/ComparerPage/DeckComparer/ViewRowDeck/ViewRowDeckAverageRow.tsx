import * as React from 'react';
import { cn } from '@/lib/utils.ts';
import { DiffDisplayMode } from '@/components/app/comparer/useComparerStore.ts';
import { CardComparisonData } from '../../types.ts';
import { calculateAverage, formatDifference, getDiffColorClass } from '../ViewRowCard/lib.ts';
import {
  DeckComparerCardGroup,
  DeckComparerDeck,
  DeckComparerTotals,
  DeckComparerTotalsMap,
} from '../types.ts';

interface ViewRowDeckAverageRowProps {
  allDecks: DeckComparerDeck[];
  allCardGroups: DeckComparerCardGroup[];
  cardComparisons: CardComparisonData[];
  groupTotals:
    | {
        mainDeck: DeckComparerTotalsMap;
        sideboard: DeckComparerTotalsMap;
      }
    | undefined;
  deckTotals: DeckComparerTotals | undefined;
  hoveredRow: string | null;
  setHoveredRow: (rowId: string | null) => void;
  hoveredColumn: number | null;
  setHoveredColumn: (columnIndex: number | null) => void;
  diffDisplayMode?: DiffDisplayMode;
}

const ViewRowDeckAverageRow: React.FC<ViewRowDeckAverageRowProps> = ({
  allDecks,
  allCardGroups,
  cardComparisons,
  groupTotals,
  deckTotals,
  hoveredRow,
  setHoveredRow,
  hoveredColumn,
  setHoveredColumn,
  diffDisplayMode = DiffDisplayMode.COUNT_AND_DIFF,
}) => {
  let lastGroupBoard = 0;

  // Get all deck IDs except the main deck
  const otherDeckIds = allDecks.filter(deck => !deck.isMain).map(deck => deck.id);

  return (
    <tr
      key="average-row"
      className="border-t font-semibold bg-accent"
      onMouseEnter={() => setHoveredRow('average-row')}
      onMouseLeave={() => setHoveredRow(null)}
    >
      {/* Average label cell */}
      <td
        className="p-2 sticky left-0 z-10 font-semibold bg-accent"
        onMouseLeave={() => setHoveredColumn(null)}
      >
        <div className="flex items-center justify-between gap-2 max-w-[172px] md:max-w-[242px] overflow-hidden">
          <span className="truncate">Average</span>
        </div>
      </td>

      {/* Card quantity cells for each group */}
      {allCardGroups.map((group, groupIndex) => {
        // Get unique card IDs for this group
        const groupCardIds = Array.from(new Set(group.cards.map(card => card.cardId)));

        if (groupCardIds.length === 0) return null;
        const displayMainOrSideColumn = lastGroupBoard !== group.board;
        lastGroupBoard = group.board;

        return (
          <React.Fragment key={`average-row-${group.board}-${group.id}`}>
            {displayMainOrSideColumn && (
              <td className="p-0 bg-background relative sticky left-[180px] md:left-[258px] z-50">
                <div className="p-1 bg-primary/20 flex items-center justify-center w-full h-[60px]">
                  {' ' /* Empty cell for the Main/Side indicator */}
                </div>
              </td>
            )}
            {/* Group divider cell */}
            <td
              className="p-1 bg-accent text-center relative"
              onMouseLeave={() => setHoveredColumn(null)}
            >
              {/* Group average */}
              {(() => {
                // Use pre-computed group totals
                const groupQuantities =
                  groupTotals?.[group.board === 1 ? 'mainDeck' : 'sideboard']?.[group.id]
                    ?.allTotals || [];

                // Calculate average
                const { avg, formatted: formattedAvg } = calculateAverage(groupQuantities);

                // Calculate difference from main deck
                const mainDeckTotal = groupQuantities[0]; // First deck is the main deck
                const diff = avg - mainDeckTotal;

                // If there's no significant difference, just show the average
                if (Math.abs(diff) < 0.01) {
                  return <span>{formattedAvg}</span>;
                }

                // Determine text color based on diff
                const textColorClass = getDiffColorClass(diff);

                // Format the diff with a + sign if positive
                const formattedDiff = formatDifference(diff, true);

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
              })()}
            </td>

            {/* Card quantity cells */}
            {groupCardIds.map((cardId, cardIndex) => {
              const columnIndex = groupIndex * 100 + cardIndex + 1;

              // Find card comparison data
              const cardComparisonData = cardComparisons.find(
                c => c.cardId === cardId && c.board === group.board,
              );

              if (!cardComparisonData) {
                return (
                  <td
                    key={`average-row-${group.id}-${cardId}`}
                    className={cn('p-1 text-center min-w-[55px]', {
                      'bg-accent': hoveredRow === 'average-row' || hoveredColumn === columnIndex,
                    })}
                    onMouseEnter={() => setHoveredColumn(columnIndex)}
                    onMouseLeave={() => setHoveredColumn(null)}
                  >
                    0
                  </td>
                );
              }

              // Get quantities for all decks
              const quantities = [
                cardComparisonData.mainDeckQuantity,
                ...otherDeckIds.map(deckId => cardComparisonData.otherDecksQuantities[deckId] || 0),
              ];

              // Calculate average
              const { avg, formatted: formattedAvg } = calculateAverage(quantities);

              // Calculate difference from main deck
              const mainQty = cardComparisonData.mainDeckQuantity;
              const diff = avg - mainQty;

              // If there's no significant difference, just show the average
              if (Math.abs(diff) < 0.01) {
                return (
                  <td
                    key={`average-row-${group.id}-${cardId}`}
                    className={cn('p-1 text-center min-w-[55px]', {
                      'bg-accent': hoveredRow === 'average-row' || hoveredColumn === columnIndex,
                    })}
                    onMouseEnter={() => setHoveredColumn(columnIndex)}
                    onMouseLeave={() => setHoveredColumn(null)}
                  >
                    {formattedAvg}
                  </td>
                );
              }

              // Determine text color based on diff
              const textColorClass = getDiffColorClass(diff);

              // Format the diff with a + sign if positive
              const formattedDiff = formatDifference(diff, true);

              // Render based on display mode
              let content;
              if (diffDisplayMode === DiffDisplayMode.COUNT_ONLY) {
                content = <span className={textColorClass + ' font-medium'}>{formattedAvg}</span>;
              } else if (diffDisplayMode === DiffDisplayMode.DIFF_ONLY) {
                content = <span className={textColorClass + ' font-medium'}>{formattedDiff}</span>;
              } else {
                // Default: COUNT_AND_DIFF
                content = (
                  <span className={textColorClass + ' font-medium'}>
                    {formattedAvg} <span className="text-xs">({formattedDiff})</span>
                  </span>
                );
              }

              return (
                <td
                  key={`average-row-${group.id}-${cardId}`}
                  className={cn('p-1 text-center min-w-[55px]', {
                    'bg-accent': hoveredRow === 'average-row' || hoveredColumn === columnIndex,
                  })}
                  onMouseEnter={() => setHoveredColumn(columnIndex)}
                  onMouseLeave={() => setHoveredColumn(null)}
                >
                  {content}
                </td>
              );
            })}
          </React.Fragment>
        );
      })}

      {/* Total cell */}
      <td
        className="p-1 text-center bg-accent relative"
        onMouseLeave={() => setHoveredColumn(null)}
      >
        {(() => {
          // Use pre-computed deck totals
          const preComputedDeckTotals = deckTotals?.allTotals || [];

          // Calculate average
          const { avg, formatted: formattedAvg } = calculateAverage(preComputedDeckTotals);

          // Calculate difference from main deck
          const mainDeckTotal = preComputedDeckTotals[0]; // First deck is the main deck
          const diff = avg - mainDeckTotal;

          // If there's no significant difference, just show the average
          if (Math.abs(diff) < 0.01) {
            return <span>{formattedAvg}</span>;
          }

          // Determine text color based on diff
          const textColorClass = getDiffColorClass(diff);

          // Format the diff with a + sign if positive
          const formattedDiff = formatDifference(diff, true);

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
        })()}
      </td>
    </tr>
  );
};

export default ViewRowDeckAverageRow;

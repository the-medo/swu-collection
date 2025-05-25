import * as React from 'react';
import { cn } from '@/lib/utils.ts';
import { DiffDisplayMode } from '@/components/app/comparer/useComparerStore.ts';
import { CardComparisonData } from '../../types.ts';
import DeckColumnMenu from '@/components/app/comparer/ComparerPage/DeckComparer/DeckColumnMenu.tsx';
import { DeckComparerCardGroup, DeckComparerDeck, DeckComparerTotalsMap } from '../types.ts';

interface ViewRowDeckRowProps {
  deck: DeckComparerDeck;
  allCardGroups: DeckComparerCardGroup[];
  cardComparisons: CardComparisonData[];
  groupTotals:
    | {
        mainDeck: DeckComparerTotalsMap;
        sideboard: DeckComparerTotalsMap;
      }
    | undefined;
  deckTotals:
    | {
        mainDeckTotal: number;
        otherDeckTotals: Record<string, number>;
        allTotals: number[];
      }
    | undefined;
  hoveredRow: string | null;
  setHoveredRow: (rowId: string | null) => void;
  hoveredColumn: number | null;
  setHoveredColumn: (columnIndex: number | null) => void;
  diffDisplayMode?: DiffDisplayMode;
}

const ViewRowDeckRow: React.FC<ViewRowDeckRowProps> = ({
  deck,
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

  return (
    <tr
      className={cn('border-t', {
        'bg-accent': hoveredRow === deck.id || deck.isMain,
        'font-semibold': deck.isMain,
      })}
      onMouseEnter={() => setHoveredRow(deck.id)}
      onMouseLeave={() => setHoveredRow(null)}
    >
      {/* Deck name cell */}
      <td
        className={cn('p-2 sticky left-0 z-10 bg-background', {
          'bg-accent': hoveredRow === deck.id,
          'font-semibold': deck.isMain,
        })}
        onMouseEnter={() => setHoveredColumn(-1)}
        onMouseLeave={() => setHoveredColumn(null)}
      >
        <div className="flex items-center justify-between gap-2 max-w-[172px] md:max-w-[242px] overflow-hidden">
          <span className="truncate">{deck.name}</span>
          {deck.isMain && <span className="text-xs text-muted-foreground">(Main)</span>}
        </div>
      </td>

      {/* Card quantity cells for each group */}
      {allCardGroups.map((group, groupIndex) => {
        // Get unique card IDs for this group
        const groupCardIds = Array.from(new Set(group.cards.map(card => card.cardId)));

        if (groupCardIds.length === 0) return null;
        const displayMainOrSideColumn = lastGroupBoard !== group.board;
        lastGroupBoard = group.board;

        // Use pre-computed group totals
        const groupTotal = deck.isMain
          ? groupTotals?.[group.board === 1 ? 'mainDeck' : 'sideboard']?.[group.id]
              ?.mainDeckTotal || 0
          : groupTotals?.[group.board === 1 ? 'mainDeck' : 'sideboard']?.[group.id]
              ?.otherDeckTotals?.[deck.id] || 0;

        return (
          <React.Fragment key={`${deck.id}-${group.board}-${group.id}`}>
            {displayMainOrSideColumn && (
              <td className="p-0 bg-background relative sticky left-[180px] md:left-[258px] z-50">
                <div className="p-1 bg-primary/20 flex items-center justify-center">
                  <DeckColumnMenu deckId={deck.id} isMainDeck={deck.isMain} />
                </div>
              </td>
            )}
            {/* Group divider cell */}
            <td
              className="p-1 bg-accent text-center relative"
              onMouseLeave={() => setHoveredColumn(null)}
            >
              {/* Group total for this deck */}
              {(() => {
                // If it's the main deck, just show the total
                if (deck.isMain) {
                  return groupTotal;
                }

                // Use pre-computed main deck group total
                const mainDeckGroupTotal =
                  groupTotals?.[group.board === 1 ? 'mainDeck' : 'sideboard']?.[group.id]
                    ?.mainDeckTotal || 0;

                // Calculate the difference
                const diff = groupTotal - mainDeckGroupTotal;

                // If there's no difference, just show the total
                if (diff === 0) {
                  return groupTotal;
                }

                // Determine text color based on diff
                const textColorClass = diff > 0 ? 'text-green-600' : 'text-red-600';

                // Format the diff with a + sign if positive
                const formattedDiff = diff > 0 ? `+${diff}` : `${diff}`;

                // Render based on display mode
                if (diffDisplayMode === DiffDisplayMode.COUNT_ONLY) {
                  return <span className={cn('font-medium', textColorClass)}>{groupTotal}</span>;
                } else if (diffDisplayMode === DiffDisplayMode.DIFF_ONLY) {
                  return <span className={cn('font-medium', textColorClass)}>{formattedDiff}</span>;
                } else {
                  // Default: COUNT_AND_DIFF
                  return (
                    <span className={cn('font-medium', textColorClass)}>
                      {groupTotal} <span className="text-xs">({formattedDiff})</span>
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
                    key={`${deck.id}-${group.id}-${cardId}`}
                    className={cn('p-1 text-center min-w-[55px]', {
                      'bg-accent': hoveredRow === deck.id || hoveredColumn === columnIndex,
                    })}
                    onMouseEnter={() => setHoveredColumn(columnIndex)}
                    onMouseLeave={() => setHoveredColumn(null)}
                  >
                    0
                  </td>
                );
              }

              const mainQty = cardComparisonData.mainDeckQuantity;
              const otherQty = deck.isMain
                ? mainQty
                : cardComparisonData.otherDecksQuantities[deck.id] || 0;
              const diff = otherQty - mainQty;

              // If there's no difference or it's the main deck, just show the quantity
              if (diff === 0 || deck.isMain) {
                return (
                  <td
                    key={`${deck.id}-${group.id}-${cardId}`}
                    className={cn('p-1 text-center min-w-[55px]', {
                      'bg-accent': hoveredRow === deck.id || hoveredColumn === columnIndex,
                    })}
                    onMouseEnter={() => setHoveredColumn(columnIndex)}
                    onMouseLeave={() => setHoveredColumn(null)}
                  >
                    {otherQty}
                  </td>
                );
              }

              // Determine text color based on diff
              const textColorClass = diff > 0 ? 'text-green-600' : 'text-red-600';

              // Format the diff with a + sign if positive
              const formattedDiff = diff > 0 ? `+${diff}` : `${diff}`;

              // Render based on display mode
              let content;
              if (diffDisplayMode === DiffDisplayMode.COUNT_ONLY) {
                content = <span className={cn('font-medium', textColorClass)}>{otherQty}</span>;
              } else if (diffDisplayMode === DiffDisplayMode.DIFF_ONLY) {
                content = (
                  <span className={cn('font-medium', textColorClass)}>{formattedDiff}</span>
                );
              } else {
                // Default: COUNT_AND_DIFF
                content = (
                  <span className={cn('font-medium', textColorClass)}>
                    {otherQty} <span className="text-xs">({formattedDiff})</span>
                  </span>
                );
              }

              return (
                <td
                  key={`${deck.id}-${group.id}-${cardId}`}
                  className={cn('p-1 text-center min-w-[55px]', {
                    'bg-accent': hoveredRow === deck.id || hoveredColumn === columnIndex,
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
        {deck.isMain ? deckTotals?.mainDeckTotal || 0 : deckTotals?.otherDeckTotals?.[deck.id] || 0}
      </td>
    </tr>
  );
};

export default ViewRowDeckRow;

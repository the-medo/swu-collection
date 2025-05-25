import * as React from 'react';
import { cn } from '@/lib/utils.ts';
import { CardComparisonData } from '../../types.ts';
import { DiffDisplayMode } from '@/components/app/comparer/useComparerStore.ts';
import { calculateGroupTotals, calculateAndRenderGroupAverage } from './lib.ts';
import CardNameCell from './CardNameCell.tsx';
import QuantityDifferenceCell from './QuantityDifferenceCell.tsx';
import AverageQuantityCell from './AverageQuantityCell.tsx';

interface CardTypeGroupProps {
  groupName: string;
  cards: CardComparisonData[];
  cardListData: any;
  mainDeckId: string;
  otherDeckEntries: { id: string }[];
  diffDisplayMode?: DiffDisplayMode;
  hoveredRow: string | null;
  setHoveredRow: (row: string | null) => void;
  hoveredColumn: number | null;
  setHoveredColumn: (column: number | null) => void;
  preComputedTotals?: {
    mainDeckTotal: number;
    otherDeckTotals: Record<string, number>;
    allTotals: number[];
  };
}

/**
 * Component for rendering a group of cards by type
 */
const CardTypeGroup: React.FC<CardTypeGroupProps> = ({
  groupName,
  cards,
  cardListData,
  otherDeckEntries,
  diffDisplayMode = DiffDisplayMode.COUNT_AND_DIFF,
  hoveredRow,
  setHoveredRow,
  hoveredColumn,
  setHoveredColumn,
  preComputedTotals,
}) => {
  if (!cards.length) return null;

  // Use pre-computed totals if available, otherwise calculate them
  const { mainDeckTotal, otherDeckTotals, allTotals } =
    preComputedTotals ||
    calculateGroupTotals(
      cards,
      otherDeckEntries.map(entry => entry.id),
    );

  // Get other deck IDs for easier access
  const otherDeckIds = otherDeckEntries.map(entry => entry.id);

  return (
    <React.Fragment>
      {/* Group header row */}
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
          <QuantityDifferenceCell
            key={entry.id}
            mainQty={mainDeckTotal}
            otherQty={otherDeckTotals[entry.id]}
            diffDisplayMode={diffDisplayMode}
            isHovered={hoveredRow === `group-${groupName}` || hoveredColumn === index + 1}
            onMouseEnter={() => setHoveredColumn(index + 1)}
            onMouseLeave={() => setHoveredColumn(null)}
            className="pt-8"
          />
        ))}

        <td
          className="p-1 text-center w-20 font-semibold pt-8 bg-accent relative"
          onMouseEnter={() => setHoveredColumn(otherDeckEntries.length + 1)}
          onMouseLeave={() => setHoveredColumn(null)}
        >
          <div className="absolute top-0 left-0 bottom-0 w-[2px] bg-border"> </div>
          {(() => {
            const { formattedAvgTotal, hasDiff, textColorClass, formattedDiff } =
              calculateAndRenderGroupAverage(mainDeckTotal, allTotals);

            if (!hasDiff) {
              return <span>{formattedAvgTotal}</span>;
            }

            return (
              <span className={`${textColorClass} font-medium`}>
                {formattedAvgTotal} <span className="text-xs">({formattedDiff})</span>
              </span>
            );
          })()}
        </td>
      </tr>

      {/* Card rows */}
      {cards.map(card => (
        <tr
          key={card.cardId}
          className={cn('border-t', {
            'bg-accent': hoveredRow === card.cardId,
          })}
          onMouseEnter={() => setHoveredRow(card.cardId)}
          onMouseLeave={() => setHoveredRow(null)}
        >
          <CardNameCell
            cardId={card.cardId}
            cardData={cardListData?.cards[card.cardId]}
            isHovered={hoveredRow === card.cardId}
            onMouseEnter={() => setHoveredColumn(-1)}
            onMouseLeave={() => setHoveredColumn(null)}
          />

          <td
            className="text-center text-lg bg-accent font-semibold sticky left-[180px] md:left-[250px] z-10"
            onMouseEnter={() => setHoveredColumn(0)}
            onMouseLeave={() => setHoveredColumn(null)}
          >
            <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-border"></div>
            {card.mainDeckQuantity}
          </td>

          {otherDeckEntries.map((entry, index) => (
            <QuantityDifferenceCell
              key={entry.id}
              mainQty={card.mainDeckQuantity}
              otherQty={card.otherDecksQuantities[entry.id] || 0}
              diffDisplayMode={diffDisplayMode}
              isHovered={hoveredRow === card.cardId || hoveredColumn === index + 1}
              onMouseEnter={() => setHoveredColumn(index + 1)}
              onMouseLeave={() => setHoveredColumn(null)}
            />
          ))}

          <AverageQuantityCell
            card={card}
            otherDeckIds={otherDeckIds}
            diffDisplayMode={diffDisplayMode}
            onMouseEnter={() => setHoveredColumn(otherDeckEntries.length + 1)}
            onMouseLeave={() => setHoveredColumn(null)}
          />
        </tr>
      ))}
    </React.Fragment>
  );
};

export default CardTypeGroup;

import * as React from 'react';
import type { AverageDeckEditor } from '../averageDeckDraft.ts';
import AverageDeckCountCell from '../AverageDeckCountCell.tsx';
import type { CardListResponse } from '@/api/lists/useCardList.ts';
import { comparerTableStyles as styles } from '../comparerTableStyles.ts';
import QuantityValue from '../QuantityValue.tsx';
import { cn } from '@/lib/utils.ts';
import { CardComparisonData } from '../../types.ts';
import { calculateGroupTotals, calculateAverage } from './lib.ts';
import CardNameCell from './CardNameCell.tsx';
import QuantityDifferenceCell from './QuantityDifferenceCell.tsx';
import AverageQuantityCell from './AverageQuantityCell.tsx';
import { DiffDisplayMode } from '../../../../../../../../types/enums.ts';

interface CardTypeGroupProps {
  averageDeck?: AverageDeckEditor;
  groupName: string;
  cards: CardComparisonData[];
  cardListData: CardListResponse | undefined;
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
  averageDeck,
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
        className={styles.group}
        onMouseEnter={() => setHoveredRow(`group-${groupName}`)}
        onMouseLeave={() => setHoveredRow(null)}
      >
        <td
          className={cn(styles.name, styles.group, 'border-b border-[var(--workspace-border)]')}
          onMouseEnter={() => setHoveredColumn(-1)}
          onMouseLeave={() => setHoveredColumn(null)}
        >
          {groupName}
        </td>
        <td
          className={cn(styles.number, styles.reference)}
          onMouseEnter={() => setHoveredColumn(0)}
          onMouseLeave={() => setHoveredColumn(null)}
        >
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
            className="font-semibold"
          />
        ))}

        <td
          className={cn(styles.number, styles.summary)}
          onMouseEnter={() => setHoveredColumn(otherDeckEntries.length + 1)}
          onMouseLeave={() => setHoveredColumn(null)}
        >
          <QuantityValue
            quantity={calculateAverage(allTotals).avg}
            mainQuantity={mainDeckTotal}
            mode={diffDisplayMode}
            average
          />
        </td>
        {averageDeck && <td className="border-l border-[var(--workspace-border)]" />}
      </tr>

      {/* Card rows */}
      {cards.map(card => (
        <tr
          key={card.cardId}
          className={hoveredRow === card.cardId ? styles.hover : 'even:bg-muted/20'}
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
            className={cn(styles.number, styles.reference)}
            onMouseEnter={() => setHoveredColumn(0)}
            onMouseLeave={() => setHoveredColumn(null)}
          >
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
          {averageDeck && (
            <AverageDeckCountCell
              card={card}
              cardName={cardListData?.cards[card.cardId]?.name ?? card.cardId}
              editor={averageDeck}
            />
          )}
        </tr>
      ))}
    </React.Fragment>
  );
};

export default CardTypeGroup;

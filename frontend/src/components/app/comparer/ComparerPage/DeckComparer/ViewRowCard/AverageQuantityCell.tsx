import * as React from 'react';
import { CardComparisonData } from '../../types.ts';
import { calculateAverage, formatDifference, getDiffColorClass, getCardQuantities } from './lib.ts';
import { DiffDisplayMode } from '../../../../../../../../types/enums.ts';

interface AverageQuantityCellProps {
  card: CardComparisonData;
  otherDeckIds: string[];
  diffDisplayMode: DiffDisplayMode;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

/**
 * Component for displaying average quantities across decks
 */
const AverageQuantityCell: React.FC<AverageQuantityCellProps> = ({
  card,
  otherDeckIds,
  diffDisplayMode,
  onMouseEnter,
  onMouseLeave,
}) => {
  // Get all quantities for this card across decks
  const quantities = getCardQuantities(card, otherDeckIds);

  // Calculate average
  const { avg, formatted: formattedAvg } = calculateAverage(quantities);

  // Calculate difference from main deck
  const diff = avg - card.mainDeckQuantity;

  // If there's no significant difference, just show the average
  if (Math.abs(diff) < 0.01) {
    return (
      <td
        className="p-1 text-center min-w-[55px] bg-accent relative"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <div className="absolute top-0 left-0 bottom-0 w-[2px] bg-border"> </div>
        <span>{formattedAvg}</span>
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
      className="p-1 text-center min-w-[55px] bg-accent relative"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="absolute top-0 left-0 bottom-0 w-[2px] bg-border"> </div>
      {content}
    </td>
  );
};

export default AverageQuantityCell;

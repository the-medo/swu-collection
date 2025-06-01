import * as React from 'react';
import { cn } from '@/lib/utils.ts';
import { formatDifference, getDiffColorClass } from './lib.ts';
import { DiffDisplayMode } from '../../../../../../../../types/enums.ts';

interface QuantityDifferenceCellProps {
  mainQty: number;
  otherQty: number;
  diffDisplayMode: DiffDisplayMode;
  isHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  className?: string;
}

/**
 * Component for displaying quantity differences between decks
 */
const QuantityDifferenceCell: React.FC<QuantityDifferenceCellProps> = ({
  mainQty,
  otherQty,
  diffDisplayMode,
  isHovered,
  onMouseEnter,
  onMouseLeave,
  className,
}) => {
  const diff = otherQty - mainQty;

  // If there's no difference, just show the quantity
  if (diff === 0) {
    return (
      <td
        className={cn('p-1 text-center min-w-[55px]', className, {
          'bg-accent': isHovered,
        })}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <span>{otherQty}</span>
      </td>
    );
  }

  // Determine text color based on diff
  const textColorClass = getDiffColorClass(diff);

  // Format the diff with a + sign if positive
  const formattedDiff = formatDifference(diff);

  // Render based on display mode
  let content;
  if (diffDisplayMode === DiffDisplayMode.COUNT_ONLY) {
    content = <span className={cn('font-medium', textColorClass)}>{otherQty}</span>;
  } else if (diffDisplayMode === DiffDisplayMode.DIFF_ONLY) {
    content = <span className={cn('font-medium', textColorClass)}>{formattedDiff}</span>;
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
      className={cn('p-1 text-center min-w-[55px]', className, {
        'bg-accent': isHovered,
      })}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {content}
    </td>
  );
};

export default QuantityDifferenceCell;

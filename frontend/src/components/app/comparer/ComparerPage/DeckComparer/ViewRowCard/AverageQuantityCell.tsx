import type { MouseEventHandler } from 'react';
import { CardComparisonData } from '../../types.ts';
import { calculateAverage, getCardQuantities } from './lib.ts';
import { DiffDisplayMode } from '../../../../../../../../types/enums.ts';
import QuantityValue from '../QuantityValue.tsx';
import { comparerTableStyles as styles } from '../comparerTableStyles.ts';
import { cn } from '@/lib/utils.ts';

interface AverageQuantityCellProps {
  card: CardComparisonData;
  otherDeckIds: string[];
  diffDisplayMode?: DiffDisplayMode;
  onMouseEnter: MouseEventHandler;
  onMouseLeave: MouseEventHandler;
}

const AverageQuantityCell = ({
  card,
  otherDeckIds,
  diffDisplayMode,
  onMouseEnter,
  onMouseLeave,
}: AverageQuantityCellProps) => {
  const { avg } = calculateAverage(getCardQuantities(card, otherDeckIds));
  return (
    <td
      className={cn(styles.number, styles.summary)}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <QuantityValue
        quantity={avg}
        mainQuantity={card.mainDeckQuantity}
        mode={diffDisplayMode}
        average
      />
    </td>
  );
};

export default AverageQuantityCell;

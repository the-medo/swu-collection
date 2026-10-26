import type { MouseEventHandler } from 'react';
import { cn } from '@/lib/utils.ts';
import { DiffDisplayMode } from '../../../../../../../../types/enums.ts';
import QuantityValue from '../QuantityValue.tsx';
import { comparerTableStyles as styles } from '../comparerTableStyles.ts';

interface QuantityDifferenceCellProps {
  mainQty: number;
  otherQty: number;
  diffDisplayMode?: DiffDisplayMode;
  isHovered: boolean;
  onMouseEnter: MouseEventHandler;
  onMouseLeave: MouseEventHandler;
  className?: string;
}

const QuantityDifferenceCell = ({
  mainQty,
  otherQty,
  diffDisplayMode,
  isHovered,
  onMouseEnter,
  onMouseLeave,
  className,
}: QuantityDifferenceCellProps) => (
  <td
    className={cn(styles.number, isHovered && styles.hover, className)}
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
  >
    <QuantityValue quantity={otherQty} mainQuantity={mainQty} mode={diffDisplayMode} />
  </td>
);

export default QuantityDifferenceCell;

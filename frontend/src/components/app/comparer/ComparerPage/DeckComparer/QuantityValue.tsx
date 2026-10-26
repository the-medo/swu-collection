import { DiffDisplayMode } from '../../../../../../../types/enums.ts';
import { cn } from '@/lib/utils.ts';
import { formatDifference } from './ViewRowCard/lib.ts';

interface QuantityValueProps {
  quantity: number;
  mainQuantity: number;
  mode?: DiffDisplayMode;
  average?: boolean;
}

const QuantityValue = ({
  quantity,
  mainQuantity,
  mode = DiffDisplayMode.COUNT_AND_DIFF,
  average = false,
}: QuantityValueProps) => {
  const diff = quantity - mainQuantity;
  const hasDiff = Math.abs(diff) >= 0.01;
  const count = average && !Number.isInteger(quantity) ? quantity.toFixed(1) : String(quantity);
  const color =
    diff > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400';

  if (!hasDiff)
    return <span className={cn(quantity === 0 && 'text-muted-foreground/60')}>{count}</span>;

  const difference = formatDifference(diff, average);
  if (mode === DiffDisplayMode.COUNT_ONLY)
    return <span className={cn('font-medium', color)}>{count}</span>;
  if (mode === DiffDisplayMode.DIFF_ONLY)
    return <span className={cn('font-medium', color)}>{difference}</span>;

  return (
    <span className="inline-flex items-center justify-center gap-1">
      <span>{count}</span>
      <span
        className={cn(
          'rounded px-1 py-0.5 text-[10px] font-medium leading-none',
          color,
          diff > 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10',
        )}
      >
        <span className="sr-only">difference </span>
        {difference}
      </span>
    </span>
  );
};

export default QuantityValue;

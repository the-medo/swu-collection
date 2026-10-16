import { useId } from 'react';
import type { CardSize } from './model.ts';
import { cn } from '@/lib/utils.ts';

export function CardSizeSelect({
  value,
  onChange,
}: {
  value: CardSize;
  onChange: (size: CardSize) => void;
}) {
  const id = useId();
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-semibold">Card size</legend>
      <div className="grid grid-cols-3 gap-2">
        {(['small', 'medium', 'large'] as const).map((size, index) => (
          <label
            key={size}
            className={cn(
              'relative flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-2 py-3 text-xs transition-colors hover:bg-muted/50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
              value === size && 'border-primary/50 bg-primary/10 font-semibold',
            )}
          >
            <input
              type="radio"
              name={id}
              value={size}
              checked={value === size}
              onChange={() => onChange(size)}
              className="sr-only"
            />
            <span
              aria-hidden
              className={cn(
                'rounded-sm border-2 border-current opacity-50',
                ['h-4 w-3', 'h-5 w-3.5', 'h-6 w-4'][index],
              )}
            />
            {size[0].toUpperCase() + size.slice(1)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

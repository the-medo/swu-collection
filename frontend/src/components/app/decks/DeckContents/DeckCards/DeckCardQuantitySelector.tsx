import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils.ts';
import { useCallback } from 'react';

interface DeckCardQuantitySelectorProps {
  value?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  busy?: boolean;
  variant?: 'default' | 'compact' | 'gallery';
  label?: string;
  activationMode?: 'automatic' | 'manual';
}

const DeckCardQuantitySelector: React.FC<DeckCardQuantitySelectorProps> = ({
  value,
  onChange,
  disabled,
  busy,
  variant = 'default',
  label,
  activationMode,
}) => {
  const onValueChangeHandler = useCallback(
    (v: string) => {
      if (!disabled && !busy) onChange(parseInt(v));
    },
    [onChange, disabled, busy],
  );

  const compact = variant === 'compact';
  const gallery = variant === 'gallery';
  const triggerClassName = cn(
    compact && 'h-5 px-0 py-0 text-xs',
    gallery && 'h-7 px-0 py-0 text-xs',
    busy && 'cursor-wait opacity-50',
  );

  return (
    <Tabs
      value={value?.toString() ?? '0'}
      className={cn(compact && 'w-full', gallery && 'w-24 shrink-0')}
      activationMode={activationMode}
      aria-disabled={disabled || busy}
      aria-busy={busy}
      onClick={e => {
        e.stopPropagation();
      }}
      onValueChange={onValueChangeHandler}
    >
      <TabsList
        aria-label={label}
        className={cn(
          'grid w-full grid-cols-4',
          compact && 'h-6 rounded-sm p-0.5 text-xs',
          gallery && 'h-7 rounded-sm p-0 text-xs',
        )}
      >
        <TabsTrigger
          value="0"
          disabled={disabled}
          aria-disabled={busy || disabled}
          className={triggerClassName}
        >
          0
        </TabsTrigger>
        <TabsTrigger
          value="1"
          disabled={disabled}
          aria-disabled={busy || disabled}
          className={triggerClassName}
        >
          1
        </TabsTrigger>
        <TabsTrigger
          value="2"
          disabled={disabled}
          aria-disabled={busy || disabled}
          className={triggerClassName}
        >
          2
        </TabsTrigger>
        <TabsTrigger
          value="3"
          disabled={disabled}
          aria-disabled={busy || disabled}
          className={triggerClassName}
        >
          3
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
};

export default DeckCardQuantitySelector;

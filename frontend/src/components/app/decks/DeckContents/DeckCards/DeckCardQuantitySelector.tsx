import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils.ts';
import { useCallback } from 'react';

interface DeckCardQuantitySelectorProps {
  value?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  variant?: 'default' | 'compact';
}

const DeckCardQuantitySelector: React.FC<DeckCardQuantitySelectorProps> = ({
  value,
  onChange,
  disabled,
  variant = 'default',
}) => {
  const onValueChangeHandler = useCallback(
    (v: string) => {
      onChange(parseInt(v));
    },
    [onChange],
  );

  const compact = variant === 'compact';

  return (
    <Tabs
      value={value?.toString() ?? '0'}
      className={cn(compact && 'w-full')}
      aria-disabled={disabled}
      onClick={e => {
        e.stopPropagation();
      }}
      onValueChange={onValueChangeHandler}
    >
      <TabsList
        className={cn('grid w-full grid-cols-4', compact && 'h-6 rounded-sm p-0.5 text-xs')}
      >
        <TabsTrigger
          value="0"
          disabled={disabled}
          className={cn(compact && 'h-5 px-0 py-0 text-xs')}
        >
          0
        </TabsTrigger>
        <TabsTrigger
          value="1"
          disabled={disabled}
          className={cn(compact && 'h-5 px-0 py-0 text-xs')}
        >
          1
        </TabsTrigger>
        <TabsTrigger
          value="2"
          disabled={disabled}
          className={cn(compact && 'h-5 px-0 py-0 text-xs')}
        >
          2
        </TabsTrigger>
        <TabsTrigger
          value="3"
          disabled={disabled}
          className={cn(compact && 'h-5 px-0 py-0 text-xs')}
        >
          3
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
};

export default DeckCardQuantitySelector;

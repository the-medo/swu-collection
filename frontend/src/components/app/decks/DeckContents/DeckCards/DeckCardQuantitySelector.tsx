import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCallback } from 'react';

interface DeckCardQuantitySelectorProps {
  value?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const DeckCardQuantitySelector: React.FC<DeckCardQuantitySelectorProps> = ({
  value,
  onChange,
  disabled,
}) => {
  const onValueChangeHandler = useCallback(
    (v: string) => {
      onChange(parseInt(v));
    },
    [onChange],
  );

  return (
    <Tabs
      value={value?.toString() ?? '0'}
      className=""
      aria-disabled={disabled}
      onValueChange={onValueChangeHandler}
    >
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="0" disabled={disabled}>
          0
        </TabsTrigger>
        <TabsTrigger value="1" disabled={disabled}>
          1
        </TabsTrigger>
        <TabsTrigger value="2" disabled={disabled}>
          2
        </TabsTrigger>
        <TabsTrigger value="3" disabled={disabled}>
          3
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
};

export default DeckCardQuantitySelector;

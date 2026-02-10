import * as React from 'react';
import { useCallback } from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group.tsx';

export interface GameNumberSelectorProps {
  value: 1 | 2 | undefined;
  onChange: (value: 1 | 2 | undefined) => void;
}

export const GameNumberSelector: React.FC<GameNumberSelectorProps> = ({ value, onChange }) => {
  const onValueChange = useCallback(
    (v: string) => {
      if (v === 'all') {
        onChange(undefined);
      } else if (v === '1') {
        onChange(1);
      } else if (v === '2') {
        onChange(2);
      }
    },
    [onChange],
  );

  const stringValue = value === undefined ? 'all' : value.toString();

  return (
    <ToggleGroup
      type="single"
      value={stringValue}
      onValueChange={onValueChange}
      className="justify-start gap-2"
    >
      <ToggleGroupItem value="all">All</ToggleGroupItem>
      <ToggleGroupItem value="1">Pre-sideboard</ToggleGroupItem>
      <ToggleGroupItem value="2">Post-sideboard</ToggleGroupItem>
    </ToggleGroup>
  );
};

export default GameNumberSelector;

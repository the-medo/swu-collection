import * as React from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group.tsx';
import { useCallback } from 'react';

export type MetaPart = 'all' | 'top8' | 'day2' | 'top64' | 'champions';

interface MetaPartSelectorProps {
  value: MetaPart;
  onChange: (value: MetaPart) => void;
  showDay2?: boolean;
  showTop64?: boolean;
}

const MetaPartSelector: React.FC<MetaPartSelectorProps> = ({
  value,
  onChange,
  showDay2 = false,
  showTop64 = false,
}) => {
  const onValueChange = useCallback(
    (v: string) => {
      // If v is empty (deselection), don't update the value
      if (v) {
        onChange(v as MetaPart);
      }
    },
    [onChange],
  );

  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={onValueChange}
      className="justify-start gap-2"
    >
      <ToggleGroupItem value="all">All Decks</ToggleGroupItem>
      {showDay2 && <ToggleGroupItem value="day2">Day 2</ToggleGroupItem>}
      {showTop64 && <ToggleGroupItem value="top64">Top 64</ToggleGroupItem>}
      <ToggleGroupItem value="top8">Top 8</ToggleGroupItem>
      <ToggleGroupItem value="champions">Champions</ToggleGroupItem>
    </ToggleGroup>
  );
};

export default MetaPartSelector;

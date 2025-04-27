import * as React from 'react';
import { useCallback } from 'react';
import { MatchupDisplayMode } from '../types';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group.tsx';

export interface DisplayModeSelectorProps {
  value: MatchupDisplayMode;
  onChange: (value: MatchupDisplayMode) => void;
}

export const DisplayModeSelector: React.FC<DisplayModeSelectorProps> = ({ value, onChange }) => {
  const onValueChange = useCallback(
    (v: string) => {
      // If v is empty (deselection), don't update the value
      if (v) {
        onChange(v as any);
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
      <ToggleGroupItem value="winLoss">Win/Loss Count</ToggleGroupItem>
      <ToggleGroupItem value="winrate">Winrate %</ToggleGroupItem>
    </ToggleGroup>
  );
};

export default DisplayModeSelector;

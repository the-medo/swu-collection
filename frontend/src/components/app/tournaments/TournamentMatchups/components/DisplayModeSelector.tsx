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
      <ToggleGroupItem value="winLoss">M W/L</ToggleGroupItem>
      <ToggleGroupItem value="winrate">M WR%</ToggleGroupItem>
      <ToggleGroupItem value="gameWinLoss">G W/L</ToggleGroupItem>
      <ToggleGroupItem value="gameWinrate">G WR%</ToggleGroupItem>
    </ToggleGroup>
  );
};

export default DisplayModeSelector;

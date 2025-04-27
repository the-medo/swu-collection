import * as React from 'react';
import { useCallback } from 'react';
import { MatchFilter } from '../types';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';

export interface MatchFilterSelectorProps {
  value: MatchFilter;
  onChange: (value: MatchFilter) => void;
  minRound: number;
  onMinRoundChange: (value: number) => void;
  minPoints: number;
  onMinPointsChange: (value: number) => void;
}

export const MatchFilterSelector: React.FC<MatchFilterSelectorProps> = ({
  value,
  onChange,
  minRound,
  onMinRoundChange,
  minPoints,
  onMinPointsChange,
}) => {
  const onValueChange = useCallback(
    (v: string) => {
      // If v is empty (deselection), don't update the value
      if (v) {
        onChange(v as any);
      }
    },
    [onChange],
  );

  const handleMinRoundChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 1) {
      onMinRoundChange(value);
    }
  };

  const handleMinPointsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 0) {
      onMinPointsChange(value);
    }
  };

  return (
    <div className="space-y-4">
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={onValueChange}
        className="justify-start gap-2"
      >
        <ToggleGroupItem value="all">All matches</ToggleGroupItem>
        <ToggleGroupItem value="day2">Day 2 player matches</ToggleGroupItem>
        <ToggleGroupItem value="custom">Custom filter</ToggleGroupItem>
      </ToggleGroup>

      {value === 'custom' && (
        <div className="flex gap-4 items-end">
          <div className="space-y-2">
            <Label htmlFor="minRound">Minimum round</Label>
            <Input
              id="minRound"
              type="number"
              min={1}
              value={minRound}
              onChange={handleMinRoundChange}
              className="w-24"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="minPoints">Minimum points</Label>
            <Input
              id="minPoints"
              type="number"
              min={0}
              value={minPoints}
              onChange={handleMinPointsChange}
              className="w-24"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchFilterSelector;

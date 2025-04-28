import * as React from 'react';
import { useCallback } from 'react';
import { MatchFilter } from '../types';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip.tsx';
import { Alert } from '@/components/ui/alert.tsx';

export interface MatchFilterSelectorProps {
  value: MatchFilter;
  onChange: (value: MatchFilter) => void;
  minRound?: number;
  onMinRoundChange: (value: number | undefined) => void;
  minPoints?: number;
  onMinPointsChange: (value: number | undefined) => void;
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
    if (e.target.value === '') {
      // Allow empty input by passing undefined
      onMinRoundChange(undefined);
      return;
    }

    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 1) {
      onMinRoundChange(value);
    } else {
      onMinRoundChange(undefined);
    }
  };

  const handleMinPointsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value === '') {
      // Allow empty input by passing undefined
      onMinPointsChange(undefined);
      return;
    }

    const value = parseInt(e.target.value);
    if (!isNaN(value)) {
      onMinPointsChange(value);
    } else {
      onMinPointsChange(undefined);
    }
  };

  return (
    <div className="space-y-2">
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={onValueChange}
        className="justify-start gap-2"
      >
        <ToggleGroupItem value="all">All matches</ToggleGroupItem>
        <Tooltip>
          <TooltipTrigger>
            <ToggleGroupItem value="day2" className="relative">
              Day 2 player matches
              <Info size={14} className="ml-1 inline-block" />
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent className="flex flex-col gap-2 text-sm max-w-[400px]">
            <h4 className="font-semibold">Day 2 Player Matches</h4>
            <span>
              Contains all matches from players that got into day 2, including matches of these
              players from day 1.
            </span>
            <span>
              If you want only matches from day 2, you need to do it through Custom filter, for
              example SQ in Richmond had 8 rounds in day 1, so you need to set "Min round" to 9.
            </span>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger>
            <ToggleGroupItem value="custom" className="relative">
              Custom filter
              <Info size={14} className="ml-1 inline-block" />
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent className="flex flex-col gap-2 text-sm max-w-[400px]">
            <h4 className="font-semibold">Custom Filter</h4>

            <span>Allows you to set minimum round and minimum points to filter matches.</span>
            <span>All filled conditions needs to be met to analyze the match.</span>
            <span>
              When using points, match needs to have at least one player with this amount of points
              at the start of the match.
            </span>
            <ul className="ml-8">
              <li>Win = 3 points</li>
              <li>Draw = 1 point</li>
              <li>Lose = 0 points</li>
            </ul>
            <Alert size="xs" className="items-start">
              <span className="font-bold">Example:</span> If you want to filter matches where player
              had at least 6 wins at given time, you can set "Min pts" to 18. Keep in mind that this
              basically eliminates earlier rounds of a tournament (in this example, no one can have
              18 points before round 6, so all matches from rounds 1-6 are discarded)
            </Alert>
          </TooltipContent>
        </Tooltip>
      </ToggleGroup>

      {value === 'custom' && (
        <div className="flex gap-4 justify-end">
          <div className="flex gap-2 items-center">
            <Label htmlFor="minRound" className="w-[100px]">
              Min rd:
            </Label>
            <Input
              id="minRound"
              type="number"
              min={1}
              value={minRound === undefined ? '' : minRound}
              onChange={handleMinRoundChange}
              className="w-16 h-6"
            />
          </div>
          <div className="flex gap-2 items-center">
            <Label htmlFor="minPoints" className="w-[100px]">
              Min pts:
            </Label>
            <Input
              id="minPoints"
              type="number"
              min={0}
              value={minPoints === undefined ? '' : minPoints}
              onChange={handleMinPointsChange}
              className="w-16 h-6"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchFilterSelector;

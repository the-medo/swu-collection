import * as React from 'react';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { Checkbox } from '@/components/ui/checkbox.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip.tsx';
import {
  createDefaultMatchupMatchFilters,
  type DeckAResultFilter,
  type MatchupMatchFilterState,
} from './matchupMatchFilterTypes.ts';

interface MatchupMatchFiltersProps {
  value: MatchupMatchFilterState;
  onChange: (value: MatchupMatchFilterState) => void;
}

const parseOptionalNumber = (value: string, min: number, max?: number) => {
  if (value === '') return undefined;

  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue)) return undefined;

  return Math.min(Math.max(parsedValue, min), max ?? Number.POSITIVE_INFINITY);
};

const MatchupMatchFilters: React.FC<MatchupMatchFiltersProps> = ({ value, onChange }) => {
  const hasActiveFilters =
    value.minPlayerCount !== undefined ||
    value.minRound !== undefined ||
    value.topCutRoundsOnly ||
    value.deckAResult !== 'any' ||
    value.maxPlacementPercentile !== undefined;

  return (
    <div className="shrink-0 rounded-md border bg-muted/30 p-3" aria-label="Match filters">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-36 space-y-1">
          <Label htmlFor="matchup-min-player-count" className="text-xs">
            Min. tournament attendance
          </Label>
          <Input
            id="matchup-min-player-count"
            type="number"
            min={1}
            step={1}
            value={value.minPlayerCount ?? ''}
            placeholder="Any"
            className="h-8 px-2"
            onChange={event =>
              onChange({
                ...value,
                minPlayerCount: parseOptionalNumber(event.target.value, 1),
              })
            }
          />
        </div>

        <div className="w-28 space-y-1">
          <Label htmlFor="matchup-min-round" className="text-xs">
            Min. round
          </Label>
          <Input
            id="matchup-min-round"
            type="number"
            min={1}
            step={1}
            value={value.minRound ?? ''}
            placeholder="Any"
            className="h-8 px-2"
            onChange={event =>
              onChange({
                ...value,
                minRound: parseOptionalNumber(event.target.value, 1),
              })
            }
          />
        </div>

        <div className="w-32 space-y-1">
          <Label htmlFor="matchup-deck-a-result" className="text-xs">
            Deck A result
          </Label>
          <Select
            value={value.deckAResult}
            onValueChange={(deckAResult: DeckAResultFilter) => onChange({ ...value, deckAResult })}
          >
            <SelectTrigger id="matchup-deck-a-result" className="h-8 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              <SelectItem value="win">Win</SelectItem>
              <SelectItem value="loss">Loss</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-36 space-y-1">
          <div className="flex items-center gap-1">
            <Label htmlFor="matchup-placement-percentile" className="text-xs">
              Both players top %
            </Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
                  aria-label="Explain final placement percentile filter"
                >
                  <Info className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-72">
                Only include matches where both players finished within this percentage of the
                tournament field. For example, 25% keeps players who finished in the top quarter.
              </TooltipContent>
            </Tooltip>
          </div>
          <Input
            id="matchup-placement-percentile"
            type="number"
            min={1}
            max={100}
            step={1}
            value={value.maxPlacementPercentile ?? ''}
            placeholder="Any"
            className="h-8 px-2"
            title="Require both players to finish within this top percentage of the tournament field"
            onChange={event =>
              onChange({
                ...value,
                maxPlacementPercentile: parseOptionalNumber(event.target.value, 1, 100),
              })
            }
          />
        </div>

        <div className="flex h-8 items-center gap-2 px-1">
          <Checkbox
            id="matchup-top-cut-rounds"
            checked={value.topCutRoundsOnly}
            onCheckedChange={checked => onChange({ ...value, topCutRoundsOnly: checked === true })}
          />
          <Label
            htmlFor="matchup-top-cut-rounds"
            className="whitespace-nowrap text-xs"
            title="Include only rounds belonging to the tournament's declared elimination bracket"
          >
            Top cut rounds only
          </Label>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8"
          disabled={!hasActiveFilters}
          onClick={() => onChange(createDefaultMatchupMatchFilters())}
        >
          Clear filters
        </Button>
      </div>
    </div>
  );
};

export default MatchupMatchFilters;

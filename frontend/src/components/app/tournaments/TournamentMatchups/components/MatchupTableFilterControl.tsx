import * as React from 'react';
import { Filter, X } from 'lucide-react';
import MultiAspectFilter from '@/components/app/global/MultiAspectFilter/MultiAspectFilter.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.tsx';
import { Switch } from '@/components/ui/switch.tsx';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip.tsx';
import type { SwuAspect } from '../../../../../../../types/enums.ts';
import type { MatchupDimensionFilterConfig } from '../../../../../../../types/TournamentMatchupFilters.ts';
import {
  createDefaultMatchupTableFilterState,
  normalizeMatchupDimensionFilterConfig,
  normalizeMatchupTableFilterConfig,
  type MatchupTableFilterState,
} from '../utils/matchupTableFilters.ts';

export interface MatchupTableFilterControlProps {
  value: MatchupTableFilterState;
  onChange: (value: MatchupTableFilterState) => void;
  active: boolean;
}

type FilterDimension = 'rowFilters' | 'columnFilters';

interface DimensionFilterPanelProps {
  title: string;
  value: MatchupDimensionFilterConfig;
  onTextChange: (text: string) => void;
  onAspectsChange: (aspects: SwuAspect[]) => void;
}

const iconButtonClassName = 'h-8 w-8 shrink-0';

const TooltipIconButton = ({
  label,
  children,
  ...buttonProps
}: React.ComponentProps<typeof Button> & { label: string }) => (
  <TooltipProvider delayDuration={150}>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="button" variant="ghost" size="iconMedium" {...buttonProps}>
          {children}
          <span className="sr-only">{label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

const DimensionFilterPanel = ({
  title,
  value,
  onTextChange,
  onAspectsChange,
}: DimensionFilterPanelProps) => (
  <div className="space-y-2 rounded-md border bg-background p-3">
    <div className="text-sm font-semibold">{title}</div>
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">Text</Label>
      <Input
        type="text"
        value={value.text}
        onChange={event => onTextChange(event.target.value)}
        className="h-8 text-sm"
      />
    </div>
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">Aspects</Label>
      <MultiAspectFilter
        value={value.aspects}
        onChange={onAspectsChange}
        multiSelect
        multiMainAspects
        showAllOption={false}
        showNoneOption={false}
        showLabel={false}
        iconSize="xSmall"
        className="justify-start gap-1"
      />
    </div>
  </div>
);

const cloneDimensionFilter = (
  filter: MatchupDimensionFilterConfig,
): MatchupDimensionFilterConfig => ({
  text: filter.text,
  aspects: [...filter.aspects],
});

const MatchupTableFilterControl: React.FC<MatchupTableFilterControlProps> = ({
  value,
  onChange,
  active,
}) => {
  const normalizedValue = React.useMemo(() => normalizeMatchupTableFilterConfig(value), [value]);

  const updateDimension = React.useCallback(
    (dimension: FilterDimension, patch: Partial<MatchupDimensionFilterConfig>) => {
      const nextDimensionFilter = normalizeMatchupDimensionFilterConfig({
        ...normalizedValue[dimension],
        ...patch,
      });

      if (normalizedValue.isMirrored || dimension === 'rowFilters') {
        onChange(
          normalizeMatchupTableFilterConfig({
            ...normalizedValue,
            rowFilters: nextDimensionFilter,
            columnFilters: normalizedValue.isMirrored
              ? cloneDimensionFilter(nextDimensionFilter)
              : normalizedValue.columnFilters,
          }),
        );
        return;
      }

      onChange(
        normalizeMatchupTableFilterConfig({
          ...normalizedValue,
          columnFilters: nextDimensionFilter,
        }),
      );
    },
    [normalizedValue, onChange],
  );

  const setMirrored = React.useCallback(
    (isMirrored: boolean) => {
      const rowFilters = cloneDimensionFilter(normalizedValue.rowFilters);

      onChange(
        normalizeMatchupTableFilterConfig({
          ...normalizedValue,
          isMirrored,
          rowFilters,
          columnFilters: isMirrored
            ? cloneDimensionFilter(rowFilters)
            : normalizedValue.columnFilters,
        }),
      );
    },
    [normalizedValue, onChange],
  );

  const clearFilters = React.useCallback(() => {
    onChange(createDefaultMatchupTableFilterState());
  }, [onChange]);

  return (
    <div className="flex min-h-10 min-w-[220px] items-center gap-1 rounded-md p-1">
      <Input
        type="text"
        placeholder="Filter..."
        value={normalizedValue.rowFilters.text}
        onChange={event => updateDimension('rowFilters', { text: event.target.value })}
        className="h-8 min-w-0 flex-1 text-sm"
      />
      <Popover>
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant={active ? 'secondary' : 'ghost'}
                  size="iconMedium"
                  className={iconButtonClassName}
                >
                  <Filter className="h-4 w-4" />
                  <span className="sr-only">Table filters</span>
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>Table filters</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <PopoverContent align="start" className="w-[min(92vw,520px)] p-3">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="matchup-table-filter-lock" className="text-sm">
                Lock rows and columns
              </Label>
              <Switch
                id="matchup-table-filter-lock"
                checked={normalizedValue.isMirrored}
                onCheckedChange={setMirrored}
              />
            </div>

            {normalizedValue.isMirrored ? (
              <DimensionFilterPanel
                title="Rows and columns"
                value={normalizedValue.rowFilters}
                onTextChange={text => updateDimension('rowFilters', { text })}
                onAspectsChange={aspects => updateDimension('rowFilters', { aspects })}
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <DimensionFilterPanel
                  title="Rows"
                  value={normalizedValue.rowFilters}
                  onTextChange={text => updateDimension('rowFilters', { text })}
                  onAspectsChange={aspects => updateDimension('rowFilters', { aspects })}
                />
                <DimensionFilterPanel
                  title="Columns"
                  value={normalizedValue.columnFilters}
                  onTextChange={text => updateDimension('columnFilters', { text })}
                  onAspectsChange={aspects => updateDimension('columnFilters', { aspects })}
                />
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
      {active && (
        <TooltipIconButton
          label="Clear table filters"
          className={iconButtonClassName}
          onClick={clearFilters}
        >
          <X className="h-4 w-4" />
        </TooltipIconButton>
      )}
    </div>
  );
};

export default MatchupTableFilterControl;

import * as React from 'react';
import { ChevronDown, Loader2, Trash2 } from 'lucide-react';
import {
  useDeleteTournamentMatchupFilter,
  useGetTournamentMatchupFilters,
} from '@/api/tournament-matchup-filters';
import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.tsx';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip.tsx';
import { toast } from '@/hooks/use-toast.ts';
import {
  hydrateSavedMatchupTableFilter,
  summarizeMatchupDimensionFilter,
  type MatchupTableFilterState,
} from '../utils/matchupTableFilters.tsx';
import type { SavedTournamentMatchupFilter } from '../../../../../../../types/TournamentMatchupFilters.ts';
import { useCallback, useMemo, useState } from 'react';

interface SavedMatchupFiltersPopoverProps {
  formatId?: number;
  onApply: (value: MatchupTableFilterState) => void;
}

const SavedFilterRow = ({
  filter,
  formatId,
  onApply,
}: {
  filter: SavedTournamentMatchupFilter;
  formatId: number;
  onApply: (value: MatchupTableFilterState) => void;
}) => {
  const { mutateAsync: deleteSavedFilter, isPending: isDeleting } =
    useDeleteTournamentMatchupFilter();
  const hydratedFilter = useMemo(() => hydrateSavedMatchupTableFilter(filter), [filter]);

  const deleteFilter = useCallback(
    async (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();

      try {
        await deleteSavedFilter({ id: filter.id, formatId });
        toast({ title: 'Saved filter deleted' });
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Could not delete saved filter',
          description: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [deleteSavedFilter, filter.id, formatId],
  );

  return (
    <div className="flex items-start gap-2 rounded-md border bg-background p-2 transition-colors hover:bg-accent">
      <button
        type="button"
        className="min-w-0 flex-1 text-left"
        onClick={() => onApply(hydratedFilter)}
      >
        <div className="min-w-0 space-y-1">
          <div className="flex flex-col gap-1">
            {filter.isMirrored && (
              <Badge variant="secondary" size="small">
                Locked
              </Badge>
            )}
            <div className="flex flex-wrap gap-1">
              <Badge variant="outline" size="small">
                Rows
              </Badge>
              <span className="max-w-[180px] truncate text-[11px] text-muted-foreground">
                {summarizeMatchupDimensionFilter(hydratedFilter.rowFilters)}
              </span>
            </div>

            {!filter.isMirrored && (
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline" size="small">
                  Columns
                </Badge>
                <span className="max-w-[180px] truncate text-[11px] text-muted-foreground">
                  {summarizeMatchupDimensionFilter(hydratedFilter.columnFilters)}
                </span>
              </div>
            )}
          </div>
        </div>
      </button>
      <Button
        type="button"
        variant="ghost"
        size="iconSmall"
        className="shrink-0"
        disabled={isDeleting}
        onClick={deleteFilter}
      >
        {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
        <span className="sr-only">Delete saved filter</span>
      </Button>
    </div>
  );
};

const SavedMatchupFiltersPopover: React.FC<SavedMatchupFiltersPopoverProps> = ({
  formatId,
  onApply,
}) => {
  const [open, setOpen] = useState(false);
  const savedFiltersQuery = useGetTournamentMatchupFilters(formatId, open && Boolean(formatId));

  const applyFilter = useCallback(
    (value: MatchupTableFilterState) => {
      onApply(value);
      setOpen(false);
    },
    [onApply],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button type="button" variant="ghost" size="iconMedium" className="h-8 w-8 shrink-0">
                <ChevronDown className="h-4 w-4" />
                <span className="sr-only">Saved table filters</span>
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>Saved table filters</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent
        align="start"
        className="max-h-[300px] w-[min(92vw,380px)] overflow-y-auto p-3"
      >
        {!formatId ? (
          <div className="text-sm text-muted-foreground">Saved filters are unavailable.</div>
        ) : savedFiltersQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading saved filters
          </div>
        ) : savedFiltersQuery.isError ? (
          <div className="text-sm text-destructive">Could not load saved filters.</div>
        ) : savedFiltersQuery.data?.data.length ? (
          <div className="space-y-2">
            {savedFiltersQuery.data.data.map(filter => (
              <SavedFilterRow
                key={filter.id}
                filter={filter}
                formatId={formatId}
                onApply={applyFilter}
              />
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No saved filters.</div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default SavedMatchupFiltersPopover;

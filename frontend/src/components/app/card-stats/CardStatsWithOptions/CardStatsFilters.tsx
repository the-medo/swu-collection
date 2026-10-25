import * as React from 'react';
import { useSearch, useNavigate } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import debounce from 'lodash.debounce';
import { useCallback } from 'react';
import { Search } from 'lucide-react';

const controlClassName =
  'h-8 min-w-0 rounded-lg border-[color:var(--workspace-border)] bg-background px-2.5 py-1 text-[13px] shadow-none';
const selectContentClassName =
  'rounded-lg border-[color:var(--workspace-border)] [&_[role=option]]:rounded-md [&_[role=option]]:text-[13px] [&_[role=option]:focus]:bg-[var(--workspace-soft)] [&_[role=option]:focus]:text-primary [&_[role=option][data-state=checked]]:text-primary';

interface CardStatsFiltersProps {
  className?: string;
}

const CardStatsFilters: React.FC<CardStatsFiltersProps> = ({ className }) => {
  const search = useSearch({ strict: false });
  const navigate = useNavigate();

  // Get current filter values from URL
  const sortBy = search.csSortBy || 'md';
  const groupBy = search.csGroupBy || 'none';
  const minDeckCount = search.csMinDeckCount || 0;
  const cardSearch = search.csCardSearch || '';

  // Local state for input values
  const [localCardSearch, setLocalCardSearch] = React.useState(cardSearch);
  const [localMinDeckCount, setLocalMinDeckCount] = React.useState(minDeckCount.toString());

  // Update URL search params when filters change
  const updateSearchParams = useCallback((updates: Partial<typeof search>) => {
    navigate({
      to: '.',
      search: prev => ({
        ...prev,
        ...updates,
      }),
    });
  }, []);

  const debouncedUpdateCardSearch = useCallback(
    debounce((value: string) => {
      updateSearchParams({ csCardSearch: value || undefined });
    }, 300),
    [updateSearchParams],
  );

  const debouncedUpdateMinDeckCount = useCallback(
    debounce((value: string) => {
      // Only update if it's a valid number
      const numValue = parseInt(value, 10);
      if (!isNaN(numValue) && numValue >= 0) {
        updateSearchParams({ csMinDeckCount: numValue });
      }
    }, 300),
    [updateSearchParams],
  );

  // Handle card search input change
  const handleCardSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalCardSearch(value);
    debouncedUpdateCardSearch(value);
  }, []);

  // Handle min deck count input change
  const handleMinDeckCountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalMinDeckCount(value);
    debouncedUpdateMinDeckCount(value);
  }, []);

  // Handle sort by select change
  const handleSortByChange = useCallback((value: string) => {
    updateSearchParams({ csSortBy: value as any });
  }, []);

  // Handle group by select change
  const handleGroupByChange = useCallback((value: string) => {
    updateSearchParams({ csGroupBy: value as any });
  }, []);

  return (
    <div
      className={cn(
        '@container/card-stat-filters min-w-0 rounded-xl border border-[color:var(--workspace-border)] bg-card p-2.5',
        className,
      )}
    >
      <div className="grid grid-cols-1 gap-2.5 @[280px]/card-stat-filters:grid-cols-2 @[800px]/card-stat-filters:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_7rem_minmax(0,1.2fr)]">
        {/* Sort By */}
        <div className="min-w-0 space-y-1">
          <Label htmlFor="sort-by" className="block text-xs font-medium text-muted-foreground">
            Sort by
          </Label>
          <Select value={sortBy} onValueChange={handleSortByChange}>
            <SelectTrigger id="sort-by" className={controlClassName}>
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent className={selectContentClassName}>
              <SelectItem value="md">MD Count</SelectItem>
              <SelectItem value="sb">SB Count</SelectItem>
              <SelectItem value="total">Total (MD + SB)</SelectItem>
              <SelectItem value="avgMd">Avg. MD</SelectItem>
              <SelectItem value="avgTotal">Avg. MD + SB</SelectItem>
              <SelectItem value="deckCount">Deck Count</SelectItem>
              <SelectItem value="winRate">Win Rate</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Group By */}
        <div className="min-w-0 space-y-1">
          <Label htmlFor="group-by" className="block text-xs font-medium text-muted-foreground">
            Group by
          </Label>
          <Select value={groupBy} onValueChange={handleGroupByChange}>
            <SelectTrigger id="group-by" className={controlClassName}>
              <SelectValue placeholder="Group by" />
            </SelectTrigger>
            <SelectContent className={selectContentClassName}>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="type">Card Type</SelectItem>
              <SelectItem value="cost">Card Cost</SelectItem>
              <SelectItem value="set">Set (meta share)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Min Deck Count */}
        <div className="min-w-0 space-y-1">
          <Label
            htmlFor="min-deck-count"
            className="block text-xs font-medium text-muted-foreground"
          >
            Min. decks
          </Label>
          <Input
            id="min-deck-count"
            type="number"
            min="0"
            value={localMinDeckCount}
            onChange={handleMinDeckCountChange}
            placeholder="Minimum deck count"
            className={controlClassName}
          />
        </div>

        {/* Card Search */}
        <div className="min-w-0 space-y-1">
          <Label htmlFor="card-search" className="block text-xs font-medium text-muted-foreground">
            Card search
          </Label>
          <Input
            id="card-search"
            icon={Search}
            type="text"
            value={localCardSearch}
            onChange={handleCardSearchChange}
            placeholder="Search cards..."
            className={cn(controlClassName, 'pl-8')}
          />
        </div>
      </div>
    </div>
  );
};

export default CardStatsFilters;

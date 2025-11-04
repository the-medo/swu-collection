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
    <div className={cn('space-y-4', className)}>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Sort By */}
        <div className="flex items-center gap-4 xl:pr-8 min-w-[300px]">
          <Label htmlFor="sort-by" className="max-xl:w-32 shrink-0">
            Sort by:
          </Label>
          <Select value={sortBy} onValueChange={handleSortByChange}>
            <SelectTrigger id="sort-by">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="md">MD Count</SelectItem>
              <SelectItem value="sb">SB Count</SelectItem>
              <SelectItem value="total">Total Count (MD + SB)</SelectItem>
              <SelectItem value="avgMd">Avg. MD</SelectItem>
              <SelectItem value="avgTotal">Avg. MD + SB</SelectItem>
              <SelectItem value="deckCount">Deck Count</SelectItem>
              <SelectItem value="winRate">Win Rate</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Group By */}
        <div className="flex items-center gap-4 xl:pr-8 min-w-[300px]">
          <Label htmlFor="group-by" className="max-xl:w-32 shrink-0">
            Group by:
          </Label>
          <Select value={groupBy} onValueChange={handleGroupByChange}>
            <SelectTrigger id="group-by">
              <SelectValue placeholder="Group by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="type">Card Type</SelectItem>
              <SelectItem value="cost">Card Cost</SelectItem>
              <SelectItem value="set">Set</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Min Deck Count */}
        <div className="flex items-center gap-4 xl:pr-8 min-w-[300px]">
          <Label htmlFor="min-deck-count" className="max-xl:w-32 shrink-0">
            Min. Deck Count:
          </Label>
          <Input
            id="min-deck-count"
            type="number"
            min="0"
            value={localMinDeckCount}
            onChange={handleMinDeckCountChange}
            placeholder="Minimum deck count"
            className="flex-1"
          />
        </div>

        {/* Card Search */}
        <div className="flex items-center gap-4 xl:pr-8 min-w-[300px]">
          <Label htmlFor="card-search" className="max-xl:w-32 shrink-0">
            Card Search:
          </Label>
          <Input
            id="card-search"
            type="text"
            value={localCardSearch}
            onChange={handleCardSearchChange}
            placeholder="Search cards..."
            className="flex-1"
          />
        </div>
      </div>
    </div>
  );
};

export default CardStatsFilters;

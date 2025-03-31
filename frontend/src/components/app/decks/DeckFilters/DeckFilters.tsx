import { useCallback } from 'react';
import LeaderSelector from '@/components/app/global/LeaderSelector/LeaderSelector.tsx';
import BaseSelector from '@/components/app/global/BaseSelector/BaseSelector.tsx';
import MultiAspectFilter from '@/components/app/global/MultiAspectFilter/MultiAspectFilter.tsx';
import { SwuAspect } from '../../../../../../types/enums.ts';
import { formatData } from '../../../../../../types/Format.ts';
import { useDeckFilterStore, useDeckFilterStoreActions } from './useDeckFilterStore';
import { Button } from '@/components/ui/button.tsx';
import { ArrowDownAZ, ArrowUpAZ, RefreshCcw, SlidersHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx';
import { DeckSortField } from '../../../../../../types/ZDeck.ts';

interface DeckFiltersProps {
  initialized?: boolean;
}

const DeckFilters: React.FC<DeckFiltersProps> = ({ initialized }) => {
  const {
    leaders,
    base,
    aspects,
    format,
    sortField = 'deck.updated_at',
    sortOrder = 'desc',
    activeFiltersCount,
    hasActiveFilters,
  } = useDeckFilterStore();

  const { setLeaders, setBase, setAspects, setFormat, setSortField, setSortOrder, resetFilters } =
    useDeckFilterStoreActions();

  // Leader selection handling
  const onLeaderChange = useCallback((leaderCardId: string | undefined) => {
    setLeaders(leaderCardId ? [leaderCardId] : []);
  }, []);

  // Base selection handling
  const onBaseChange = useCallback((baseCardId: string | undefined) => {
    setBase(baseCardId);
  }, []);

  // Aspect filter handling
  const onAspectChange = useCallback((selectedAspects: SwuAspect[]) => {
    setTimeout(() => setAspects(selectedAspects), 50);
  }, []);

  // Format selection handling
  const onFormatChange = useCallback((formatId: string) => {
    setTimeout(() => setFormat(formatId ? parseInt(formatId) : undefined), 50);
  }, []);

  // Sort handling
  const handleSortFieldChange = useCallback(
    (field: string) => {
      setTimeout(() => {
        if (field === sortField) {
          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
          setSortField(field);
          setSortOrder('asc');
        }
      }, 50);
    },
    [sortField, sortOrder],
  );

  // Get sort icon based on current state
  const getSortIcon = useCallback(
    (field: string) => {
      if (sortField !== field) return null;

      return sortOrder === 'asc' ? (
        <ArrowUpAZ className="h-4 w-4" />
      ) : (
        <ArrowDownAZ className="h-4 w-4" />
      );
    },
    [sortField, sortOrder],
  );

  const handleResetFilters = useCallback(() => {
    setTimeout(() => {
      resetFilters();
    }, 50);
  }, []);

  if (!initialized) {
    return <div className="p-2 flex justify-center">Loading filters...</div>;
  }

  return (
    <div className="p-2 flex flex-wrap items-center gap-2">
      <LeaderSelector
        trigger={null}
        size="w100"
        leaderCardId={leaders[0]}
        onLeaderSelected={onLeaderChange}
      />

      <BaseSelector trigger={null} size="w100" baseCardId={base} onBaseSelected={onBaseChange} />

      <MultiAspectFilter
        value={aspects}
        onChange={onAspectChange}
        multiSelect={true}
        multiMainAspects={true}
        showLabel={false}
        showAllOption={false}
        showNoneOption={false}
        className="justify-start"
      />

      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-[200px] justify-between">
            {format !== undefined ? formatData.find(f => f.id === format)?.name : 'All Formats'}
            <SlidersHorizontal className="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuRadioGroup value={format?.toString() || ''} onValueChange={onFormatChange}>
            <DropdownMenuRadioItem value="">All Formats</DropdownMenuRadioItem>
            {formatData.map(f => (
              <DropdownMenuRadioItem key={f.id} value={f.id.toString()}>
                {f.name}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-[200px] justify-between">
            {getSortLabel(sortField)} {getSortIcon(sortField)}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuRadioGroup value={sortField} onValueChange={handleSortFieldChange}>
            <DropdownMenuRadioItem value={DeckSortField.UPDATED_AT}>
              Updated {getSortIcon(DeckSortField.UPDATED_AT)}
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value={DeckSortField.CREATED_AT}>
              Created {getSortIcon(DeckSortField.CREATED_AT)}
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value={DeckSortField.NAME}>
              Name {getSortIcon(DeckSortField.NAME)}
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value={DeckSortField.FORMAT}>
              Format {getSortIcon(DeckSortField.FORMAT)}
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value={DeckSortField.FAVORITES}>
              Favorites {getSortIcon(DeckSortField.FAVORITES)}
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value={DeckSortField.SCORE}>
              Score {getSortIcon(DeckSortField.SCORE)}
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex justify-end pt-2">
        <Button
          variant="secondary"
          disabled={!hasActiveFilters}
          onClick={handleResetFilters}
          size="sm"
        >
          <RefreshCcw className="h-4 w-4 mr-2" /> Reset Filters ({activeFiltersCount})
        </Button>
      </div>
    </div>
  );
};

// Helper function to get a user-friendly label for sort fields
function getSortLabel(sortField: string): string {
  switch (sortField) {
    case DeckSortField.UPDATED_AT:
      return 'Last Updated';
    case DeckSortField.CREATED_AT:
      return 'Date Created';
    case DeckSortField.NAME:
      return 'Deck Name';
    case DeckSortField.FORMAT:
      return 'Format';
    case DeckSortField.FAVORITES:
      return 'Most Favorites';
    case DeckSortField.SCORE:
      return 'Highest Score';
    default:
      return 'Sort By';
  }
}

export default DeckFilters;

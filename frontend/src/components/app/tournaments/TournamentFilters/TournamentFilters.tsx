import * as React from 'react';
import { useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { Label } from '@/components/ui/label.tsx';
import { RefreshCcw, SlidersHorizontal } from 'lucide-react';
import { Switch } from '@/components/ui/switch.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion.tsx';
import TournamentTypeSelect from '@/components/app/tournaments/components/TournamentTypeSelect.tsx';
import ContinentSelect from '../components/ContinentSelect.tsx';
import { DatePicker } from '@/components/ui/date-picker.tsx';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Route } from '@/routes/__root.tsx';
import { useSidebar } from '@/components/ui/sidebar.tsx';

interface TournamentFiltersProps {}

export interface TournamentFilterValues {
  tfType?: string;
  tfContinent?: string;
  tfDateFrom?: string;
  tfSort?: string;
  tfOrder?: 'asc' | 'desc';
  tfShowFuture?: boolean;
}

const sortOptions = [
  { value: 'tournament.date', label: 'Date' },
  { value: 'tournament.name', label: 'Name' },
  { value: 'tournament.attendance', label: 'Attendance' },
];

const TournamentFilters: React.FC<TournamentFiltersProps> = ({}) => {
  const { tfType, tfContinent, tfDateFrom, tfSort, tfOrder, tfShowFuture } = useSearch({
    strict: false,
  });
  const { isMobile } = useSidebar();
  const navigate = useNavigate({ from: Route.fullPath });

  // Handle filter changes
  const handleFilterChange = useCallback((name: keyof TournamentFilterValues, value: any) => {
    navigate({
      search: prev => ({
        ...prev,
        [name]: value,
      }),
    });
  }, []);

  // Reset filters
  const resetFilters = useCallback(() => {
    navigate({
      search: prev => ({
        ...prev,
        tfType: undefined,
        tfContinent: undefined,
        tfDateFrom: undefined,
        tfSort: undefined,
        tfOrder: undefined,
        tfShowFuture: undefined,
      }),
    });
  }, []);

  const activeFilters = useMemo(() => {
    let filterCount = 0;
    if (tfType) filterCount++;
    if (tfContinent) filterCount++;
    if (tfDateFrom) filterCount++;
    if (tfSort) filterCount++;
    if (tfOrder) filterCount++;
    if (tfShowFuture) filterCount++;
    return filterCount;
  }, [tfType, tfContinent, tfDateFrom, tfSort, tfOrder, tfShowFuture]);

  const includeFutureTournaments = useMemo(
    () => (
      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
        <Label htmlFor="showFuture" className="mr-2">
          Include future tournaments
        </Label>
        <Switch
          id="showFuture"
          checked={!!tfShowFuture}
          onCheckedChange={checked => handleFilterChange('tfShowFuture', checked || undefined)}
        />
      </div>
    ),
    [tfShowFuture, handleFilterChange],
  );

  return (
    <Accordion
      type="single"
      collapsible
      defaultValue={activeFilters > 0 ? 'filters' : undefined}
      className="w-full mb-4 sticky"
    >
      <AccordionItem value="filters" className="border rounded-md">
        <AccordionTrigger className="px-4 pt-3 pb-1 hover:no-underline" right={isMobile}>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              <span className="font-medium">Filters & Sort</span>
              {activeFilters > 0 && (
                <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium">
                  {activeFilters} active
                </span>
              )}
            </div>
            {!isMobile && includeFutureTournaments}
          </div>
        </AccordionTrigger>
        {isMobile && <div className="p-2 px-4">{includeFutureTournaments}</div>}
        <AccordionContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Tournament Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Tournament Type</Label>
              <TournamentTypeSelect
                value={tfType || ''}
                onChange={value => handleFilterChange('tfType', value)}
                showFullName={true}
                emptyOption={true}
              />
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="tfDateFrom">Date from</Label>
              <DatePicker
                date={tfDateFrom}
                onDateChange={date => handleFilterChange('tfDateFrom', date)}
                placeholder="Filter by date"
              />
            </div>

            {/* Continent */}
            <div className="space-y-2">
              <Label htmlFor="tfContinent">Continent</Label>
              <ContinentSelect
                value={tfContinent}
                onChange={value => handleFilterChange('tfContinent', value)}
                emptyOption={true}
                placeholder="All continents"
              />
            </div>

            {/* Sort */}
            <div className="space-y-2">
              <Label htmlFor="sort">Sort By</Label>
              <div className="flex gap-2">
                <Select
                  value={tfSort || 'tournament.date'}
                  onValueChange={value => handleFilterChange('tfSort', value)}
                >
                  <SelectTrigger id="sort" className="w-full">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleFilterChange('tfOrder', tfOrder === 'asc' ? 'desc' : 'asc')}
                >
                  {tfOrder === 'asc' ? '↑' : '↓'}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex justify-between mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={resetFilters}
              disabled={activeFilters === 0}
            >
              <RefreshCcw className="h-4 w-4 mr-2" /> Reset
            </Button>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default TournamentFilters;

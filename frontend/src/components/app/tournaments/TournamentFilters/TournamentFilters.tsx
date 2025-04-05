import * as React from 'react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { RefreshCcw, SlidersHorizontal } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import SetSelect from '@/components/app/global/SetSelect.tsx';
import FormatSelect from '@/components/app/decks/components/FormatSelect.tsx';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion.tsx';
import { SwuSet } from '../../../../../../types/enums.ts';
import TournamentTypeSelect from '@/components/app/tournaments/components/TournamentTypeSelect.tsx';
import ContinentSelect from '../components/ContinentSelect.tsx';
import { DatePicker } from '@/components/ui/date-picker.tsx';

interface TournamentFiltersProps {
  onApplyFilters: (filters: TournamentFilterValues) => void;
  defaultValues?: Partial<TournamentFilterValues>;
}

export interface TournamentFilterValues {
  type?: string;
  season?: number;
  set?: SwuSet;
  format?: number;
  continent?: string;
  date?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

const sortOptions = [
  { value: 'tournament.date', label: 'Date' },
  { value: 'tournament.name', label: 'Name' },
  { value: 'tournament.attendance', label: 'Attendance' },
  { value: 'tournament_type.major', label: 'Importance' },
];

const TournamentFilters: React.FC<TournamentFiltersProps> = ({
  onApplyFilters,
  defaultValues = {},
}) => {
  const [filters, setFilters] = useState<TournamentFilterValues>(defaultValues);
  const [activeFilters, setActiveFilters] = useState<number>(0);

  // Update active filters count
  useEffect(() => {
    const count = Object.values(filters).filter(v => v !== undefined && v !== '').length;
    setActiveFilters(count);
  }, [filters]);

  // Handle filter changes
  const handleFilterChange = (name: keyof TournamentFilterValues, value: any) => {
    setFilters(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // Apply filters
  const applyFilters = () => {
    setTimeout(() => onApplyFilters(filters), 50);
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({});
    setTimeout(() => onApplyFilters({}), 50);
  };

  return (
    <Accordion
      type="single"
      collapsible
      defaultValue={activeFilters > 0 ? 'filters' : undefined}
      className="w-full mb-4 sticky"
    >
      <AccordionItem value="filters" className="border rounded-md">
        <AccordionTrigger className="px-4 pt-3 pb-1 hover:no-underline">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            <span className="font-medium">Filters</span>
            {activeFilters > 0 && (
              <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium">
                {activeFilters} active
              </span>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Tournament Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Tournament Type</Label>
              <TournamentTypeSelect
                value={filters.type || ''}
                onChange={value => handleFilterChange('type', value)}
                showFullName={true}
                emptyOption={true}
              />
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <DatePicker
                date={filters.date}
                onDateChange={date => handleFilterChange('date', date)}
                placeholder="Filter by date"
              />
            </div>

            {/* Format */}
            <div className="space-y-2">
              <Label htmlFor="format">Format</Label>
              <FormatSelect
                value={filters.format || null}
                onChange={value => handleFilterChange('format', value)}
                allowEmpty={true}
              />
            </div>

            {/* Set */}
            <div className="space-y-2">
              <Label htmlFor="set">Set</Label>
              <SetSelect
                value={filters.set || null}
                emptyOption={true}
                onChange={value => handleFilterChange('set', value)}
                showFullName
              />
            </div>

            {/* Season */}
            <div className="space-y-2">
              <Label htmlFor="season">Season</Label>
              <Input
                id="season"
                type="number"
                placeholder="Season number"
                value={filters.season || ''}
                onChange={e =>
                  handleFilterChange(
                    'season',
                    e.target.value ? parseInt(e.target.value) : undefined,
                  )
                }
                min={1}
              />
            </div>

            {/* Continent */}
            <div className="space-y-2">
              <Label htmlFor="continent">Continent</Label>
              <ContinentSelect
                value={filters.continent}
                onChange={value => handleFilterChange('continent', value)}
                emptyOption={true}
                placeholder="All continents"
              />
            </div>

            {/* Sort */}
            <div className="space-y-2">
              <Label htmlFor="sort">Sort By</Label>
              <div className="flex gap-2">
                <Select
                  value={filters.sort || 'tournament.date'}
                  onValueChange={value => handleFilterChange('sort', value)}
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
                  onClick={() =>
                    handleFilterChange('order', filters.order === 'asc' ? 'desc' : 'asc')
                  }
                >
                  {filters.order === 'asc' ? '↑' : '↓'}
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
            <Button onClick={applyFilters}>Apply Filters</Button>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default TournamentFilters;

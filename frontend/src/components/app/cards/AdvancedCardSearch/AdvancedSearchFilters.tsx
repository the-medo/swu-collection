import * as React from 'react';
import { useCardList } from '@/api/lists/useCardList';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Filter, Loader2, RefreshCcw, Search, X } from 'lucide-react';
import MultiAspectFilter from '@/components/app/global/MultiAspectFilter/MultiAspectFilter';
import {
  useAdvancedCardSearchStore,
  useAdvancedCardSearchStoreActions,
} from './useAdvancedCardSearchStore';
import { SwuArena } from '../../../../../../types/enums.ts';
import GenericMultiSelect from '@/components/app/global/GenericMultiSelect/GenericMultiSelect.tsx';
import RangeFilter from '@/components/app/global/RangeFilter/RangeFilter.tsx';
import { cn } from '@/lib/utils.ts';
import { useSidebar } from '@/components/ui/sidebar.tsx';
import SetMultiSelect from '@/components/app/global/SetMultiSelect.tsx';
import RarityMultiSelect from '@/components/app/global/RarityMultiSelect.tsx';
import { Separator } from '@/components/ui/separator.tsx';
import { Checkbox } from '@/components/ui/checkbox.tsx';
import { KeyboardEventHandler, useCallback } from 'react';

// Available card types
const CARD_TYPES = ['Leader', 'Base', 'Unit', 'Event', 'Upgrade'];

interface AdvancedSearchFiltersProps {
  onSearch: () => void;
  footerElement?: React.ReactNode;
}

const AdvancedSearchFilters: React.FC<AdvancedSearchFiltersProps> = ({
  onSearch,
  footerElement,
}) => {
  const { open: sidebarOpen } = useSidebar();
  const { data: cardListData, isLoading: isLoadingCardList } = useCardList();

  // Get search store state and actions
  const {
    name,
    text,
    sets,
    rarities,
    cardTypes,
    aspects,
    arenas,
    traits,
    keywords,
    variants,
    cost,
    power,
    hp,
    upgradePower,
    upgradeHp,
    isSearching,
    filtersExpanded,
    activeFiltersCount,
  } = useAdvancedCardSearchStore();

  const {
    setName,
    setText,
    setSets,
    setRarities,
    setCardTypes,
    setAspects,
    setArenas,
    setTraits,
    setKeywords,
    setVariants,
    setCostRange,
    setPowerRange,
    setHpRange,
    setUpgradePowerRange,
    setUpgradeHpRange,
    setFiltersExpanded,
    resetFilters,
  } = useAdvancedCardSearchStoreActions();

  // Handle arena toggle
  const handleArenaToggle = (arena: SwuArena) => {
    if (arenas.includes(arena)) {
      setArenas(arenas.filter(a => a !== arena));
    } else {
      setArenas([...arenas, arena]);
    }
  };

  // Handle Enter key press in input fields
  const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = useCallback(
    e => {
      if (e.key === 'Enter') {
        onSearch();
      } else if (e.key === 'Escape') {
        setName('');
      }
    },
    [onSearch],
  );

  return (
    <div
      className={cn('overflow-hidden w-full md:border-r max-md:border-b p-2', {
        'md:w-[50px]': !filtersExpanded,
        'lg:w-[350px] max-w-[350px]': filtersExpanded && sidebarOpen,
        'md:w-[350px] max-w-[350px]': filtersExpanded && !sidebarOpen,
      })}
    >
      <div
        className={cn('flex transition-all duration-300 justify-between items-center p-2', {
          'md:-rotate-90 md:origin-bottom-left md:w-[200px] md:translate-x-[43px] md:translate-y-[140px]':
            !filtersExpanded,
        })}
      >
        <div className="text-2xl font-semibold tracking-tight">Search Filters</div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFiltersExpanded(!filtersExpanded)}
            title={filtersExpanded ? 'Collapse filters' : 'Expand filters'}
          >
            {filtersExpanded ? (
              <X className="h-4 w-4" />
            ) : (
              <Filter className="h-4 w-4 md:rotate-90" />
            )}
          </Button>
        </div>
      </div>
      {!filtersExpanded && (
        <div className="-rotate-90 origin-bottom-left w-[200px] translate-x-[37px] translate-y-[340px]">
          {footerElement}
        </div>
      )}

      {filtersExpanded && (
        <div className="px-2">
          <ScrollArea
            className={cn(footerElement ? 'h-[calc(100vh-215px)]' : 'h-[calc(100vh-165px)]')}
          >
            <div className="space-y-2 pr-4">
              <Input
                id="name-search"
                placeholder="Search by card name..."
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <Input
                id="text-search"
                placeholder="Search in card text, rules, deploy/epic text..."
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <div className="px-28">
                <Separator />
              </div>
              <SetMultiSelect
                value={sets}
                defaultValue={sets}
                onChange={setSets}
                showFullName={true}
              />
              <RarityMultiSelect value={rarities} defaultValue={rarities} onChange={setRarities} />

              <MultiAspectFilter
                value={aspects}
                onChange={setAspects}
                multiSelect={true}
                showLabel={false}
                showAllOption={false}
                showNoneOption={false}
                className="justify-center"
              />

              <GenericMultiSelect
                label="Card Types"
                placeholder="Select card types..."
                options={CARD_TYPES}
                value={cardTypes}
                onChange={setCardTypes}
                maxCount={3}
              />
              <div className="pt-0 pb-2 grid grid-cols-2 gap-2">
                {Object.values(SwuArena).map(arena => (
                  <div key={arena} className="flex items-center justify-center space-x-2">
                    <Checkbox
                      id={`arena-${arena}`}
                      checked={arenas.includes(arena)}
                      onCheckedChange={() => handleArenaToggle(arena)}
                    />
                    <Label htmlFor={`arena-${arena}`}>{arena}</Label>
                  </div>
                ))}
              </div>

              <RangeFilter label="Cost" value={cost} onChange={setCostRange} />
              <RangeFilter label="Power" value={power} onChange={setPowerRange} />
              <RangeFilter label="HP" value={hp} onChange={setHpRange} />
              <RangeFilter
                label="Upgrade Power"
                value={upgradePower}
                onChange={setUpgradePowerRange}
              />
              <RangeFilter label="Upgrade HP" value={upgradeHp} onChange={setUpgradeHpRange} />
              {cardListData ? (
                <GenericMultiSelect
                  label="Traits"
                  placeholder="Select traits..."
                  options={cardListData.allTraits}
                  value={traits}
                  onChange={setTraits}
                  maxCount={4}
                />
              ) : (
                <div className="text-center py-2">Loading traits...</div>
              )}
              {cardListData ? (
                <GenericMultiSelect
                  label="Keywords"
                  placeholder="Select keywords..."
                  options={cardListData.allKeywords}
                  value={keywords}
                  onChange={setKeywords}
                  maxCount={4}
                />
              ) : (
                <div className="text-center py-2">Loading keywords...</div>
              )}
              {cardListData ? (
                <GenericMultiSelect
                  label="Variants"
                  placeholder="Select variants..."
                  options={cardListData.allVariants}
                  value={variants}
                  onChange={setVariants}
                  maxCount={4}
                />
              ) : (
                <div className="text-center py-2">Loading variants...</div>
              )}
            </div>
          </ScrollArea>

          <div className="mt-4 pt-2 border-t flex-1 justify-between">
            <div className="p-2 rounded-md bg-accent/50 dark:bg-primary/10">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-medium mt-2">Applied: {activeFiltersCount}</h4>
                <div className="flex items-center gap-2">
                  {activeFiltersCount > 0 && (
                    <Button variant="secondary" onClick={resetFilters}>
                      <RefreshCcw className="mr-2 h-4 w-4" /> Reset All
                    </Button>
                  )}
                  <Button onClick={onSearch} disabled={isSearching || isLoadingCardList}>
                    {isSearching ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Searching...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" /> Search
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
          {footerElement}
        </div>
      )}
    </div>
  );
};

export default AdvancedSearchFilters;

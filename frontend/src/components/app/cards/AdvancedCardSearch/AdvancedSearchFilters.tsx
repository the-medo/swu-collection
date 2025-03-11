import * as React from 'react';
import { useCardList } from '@/api/lists/useCardList';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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

// Available card types
const CARD_TYPES = ['Leader', 'Base', 'Unit', 'Event', 'Upgrade'];

interface AdvancedSearchFiltersProps {
  onSearch: () => void;
}

const AdvancedSearchFilters: React.FC<AdvancedSearchFiltersProps> = ({ onSearch }) => {
  const { open: sidebarOpen } = useSidebar();
  const { data: cardListData, isLoading: isLoadingCardList } = useCardList();

  // Get search store state and actions
  const {
    name,
    text,
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
    hasActiveFilters,
  } = useAdvancedCardSearchStore();

  const {
    setName,
    setText,
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

  // Handle card type toggle
  const handleTypeToggle = (type: string) => {
    if (cardTypes.includes(type)) {
      setCardTypes(cardTypes.filter(t => t !== type));
    } else {
      setCardTypes([...cardTypes, type]);
    }
  };

  // Handle arena toggle
  const handleArenaToggle = (arena: SwuArena) => {
    if (arenas.includes(arena)) {
      setArenas(arenas.filter(a => a !== arena));
    } else {
      setArenas([...arenas, arena]);
    }
  };

  return (
    <div
      className={cn('overflow-hidden w-full md:border-r max-md:border-b p-2', {
        'md:w-[50px]': !filtersExpanded,
        'lg:w-[400px]': filtersExpanded && sidebarOpen,
        'md:w-[400px]': filtersExpanded && !sidebarOpen,
      })}
    >
      <div
        className={cn('flex transition-all duration-300  justify-between items-center p-2', {
          'md:-rotate-90 md:origin-bottom-left md:w-[200px] md:translate-x-[50px] md:translate-y-[200px]':
            !filtersExpanded,
        })}
      >
        <h3>Search Filters</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFiltersExpanded(!filtersExpanded)}
            title={filtersExpanded ? 'Collapse filters' : 'Expand filters'}
          >
            {filtersExpanded ? <X className="h-4 w-4" /> : <Filter className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {filtersExpanded && (
        <div className="px-2">
          <ScrollArea className="h-[calc(100vh-145px)]">
            <div className="space-y-4">
              {/* Text search fields */}
              <div className="space-y-2 pr-4">
                <Label htmlFor="name-search">Card Name</Label>
                <Input
                  id="name-search"
                  placeholder="Search by card name..."
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2 pr-4">
                <Label htmlFor="text-search">Card Text</Label>
                <Input
                  id="text-search"
                  placeholder="Search in card text, rules, deploy/epic text..."
                  value={text}
                  onChange={e => setText(e.target.value)}
                />
              </div>

              <Separator />

              {/* Card Type filter */}
              <Accordion type="single" collapsible defaultValue="types" className="w-full">
                <AccordionItem value="types">
                  <AccordionTrigger>Card Types</AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-2 gap-2">
                      {CARD_TYPES.map(type => (
                        <div key={type} className="flex items-center space-x-2">
                          <Checkbox
                            id={`type-${type}`}
                            checked={cardTypes.includes(type)}
                            onCheckedChange={() => handleTypeToggle(type)}
                          />
                          <Label htmlFor={`type-${type}`}>{type}</Label>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Aspects filter */}
              <Accordion type="single" collapsible defaultValue="aspects" className="w-full">
                <AccordionItem value="aspects">
                  <AccordionTrigger>Aspects</AccordionTrigger>
                  <AccordionContent>
                    <MultiAspectFilter
                      value={aspects}
                      onChange={setAspects}
                      multiSelect={true}
                      showLabel={false}
                    />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Arena filter */}
              <Accordion type="single" collapsible defaultValue="arenas" className="w-full">
                <AccordionItem value="arenas">
                  <AccordionTrigger>Arenas</AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.values(SwuArena).map(arena => (
                        <div key={arena} className="flex items-center space-x-2">
                          <Checkbox
                            id={`arena-${arena}`}
                            checked={arenas.includes(arena)}
                            onCheckedChange={() => handleArenaToggle(arena)}
                          />
                          <Label htmlFor={`arena-${arena}`}>{arena}</Label>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Traits filter */}
              <Accordion type="single" collapsible defaultValue="traits" className="w-full">
                <AccordionItem value="traits" className="pr-4">
                  <AccordionTrigger>Traits</AccordionTrigger>
                  <AccordionContent>
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
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Keywords filter */}
              <Accordion type="single" collapsible defaultValue="keywords" className="w-full">
                <AccordionItem value="keywords" className="pr-4">
                  <AccordionTrigger>Keywords</AccordionTrigger>
                  <AccordionContent>
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
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Variants filter */}
              <Accordion type="single" collapsible defaultValue="variants" className="w-full">
                <AccordionItem value="variants" className="pr-4">
                  <AccordionTrigger>Variants</AccordionTrigger>
                  <AccordionContent>
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
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Numeric Ranges */}
              <Accordion type="single" collapsible defaultValue="numeric" className="w-full">
                <AccordionItem value="numeric" className="pr-4">
                  <AccordionTrigger>Numeric Values</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      <RangeFilter label="Cost" value={cost} onChange={setCostRange} />

                      <RangeFilter label="Power" value={power} onChange={setPowerRange} />

                      <RangeFilter label="HP" value={hp} onChange={setHpRange} />

                      <RangeFilter
                        label="Upgrade Power"
                        value={upgradePower}
                        onChange={setUpgradePowerRange}
                      />

                      <RangeFilter
                        label="Upgrade HP"
                        value={upgradeHp}
                        onChange={setUpgradeHpRange}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </ScrollArea>

          <div className="mt-4 pt-2 border-t flex justify-between">
            <Button
              variant="destructive"
              size="sm"
              onClick={resetFilters}
              disabled={!hasActiveFilters}
            >
              <RefreshCcw className="mr-2 h-4 w-4" /> Reset
            </Button>
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
      )}
    </div>
  );
};

export default AdvancedSearchFilters;

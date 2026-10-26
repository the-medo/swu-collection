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
import { KeyboardEventHandler, useCallback, useState } from 'react';
import { AdvancedSearchStringLookup } from '@/components/app/cards/AdvancedCardSearch/advancedSearchContext.ts';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group.tsx';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip.tsx';
import {
  areAllFutureSetsSelected,
  futureSetCodes,
  isPremierOnlySetSelection,
  toggleFutureSetSelection,
  togglePremierOnlySetSelection,
  type CardUniquenessFilter,
} from './advancedSearchLib.ts';

// Available card types
const CARD_TYPES = ['Leader', 'Base', 'Unit', 'Event', 'Upgrade'];

const UNIQUENESS_OPTIONS: { value: CardUniquenessFilter; label: string }[] = [
  { value: 'both', label: 'Both' },
  { value: 'unique', label: 'Unique' },
  { value: 'not-unique', label: 'Not unique' },
];

interface AdvancedSearchFiltersProps {
  onSearch: () => void;
  mobileCollapsible?: boolean;
  onClose?: () => void;
  footerElement?: React.ReactNode;
  availableCardTypes?: AdvancedSearchStringLookup;
  disabled?: boolean;
  compact?: boolean;
}

const AdvancedSearchFilters: React.FC<AdvancedSearchFiltersProps> = ({
  onSearch,
  mobileCollapsible = false,
  onClose,
  footerElement,
  availableCardTypes,
  disabled = false,
  compact = false,
}) => {
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const { open: sidebarOpen } = useSidebar();
  const { data: cardListData, isLoading: isLoadingCardList } = useCardList();
  const [previewTooltipOpen, setPreviewTooltipOpen] = useState(false);

  // Get search store state and actions
  const {
    name,
    text,
    artist,
    sets,
    rarities,
    uniqueness,
    cardTypes,
    aspects,
    aspectsExact,
    includeNoAspect,
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
    filtersExpanded: storedFiltersExpanded,
    activeFiltersCount,
  } = useAdvancedCardSearchStore();
  const filtersExpanded = (onClose ? true : storedFiltersExpanded) && !disabled;

  const {
    setName,
    setText,
    setArtist,
    setSets,
    setRarities,
    setUniqueness,
    setCardTypes,
    setAspects,
    setAspectsExact,
    setIncludeNoAspect,
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

  // Handle Enter/Escape in text inputs
  const createTextInputKeyDownHandler = useCallback(
    (clearValue: () => void): KeyboardEventHandler<HTMLInputElement> =>
      e => {
        if (e.key === 'Enter') {
          onSearch();
          if (compact) setMobileExpanded(false);
        } else if (e.key === 'Escape') {
          clearValue();
        }
      },
    [onSearch, compact],
  );

  const availableSearchCardTypes = availableCardTypes
    ? Object.keys(availableCardTypes)
    : CARD_TYPES;
  const premierOnlySelected = isPremierOnlySetSelection(sets);
  const futureSetsSelected = areAllFutureSetsSelected(sets);
  const hasPreviewSets = futureSetCodes.length > 0;

  return (
    <div
      role="region"
      aria-label="Card search filters"
      id={onClose ? 'card-home-filters' : undefined}
      className={cn(
        'overflow-hidden w-full md:border-r max-md:border-b p-2',
        compact &&
          'shrink-0 border-[var(--workspace-border)] bg-card @[580px]/main-body:flex @[580px]/main-body:h-[calc(var(--app-content-height,100dvh)-1rem)] @[580px]/main-body:flex-col',
        mobileCollapsible && 'max-lg:!w-full max-lg:!max-w-none max-lg:border-b lg:shrink-0',
        {
          'md:w-[50px]': !filtersExpanded,
          'lg:w-[350px] max-w-[350px]': !compact && filtersExpanded && sidebarOpen,
          'md:w-[350px] max-w-[350px]': !compact && filtersExpanded && !sidebarOpen,
          'max-w-none @[580px]/main-body:w-80': compact && filtersExpanded,
          'md:w-auto @[580px]/main-body:w-12': compact && !filtersExpanded,
        },
      )}
    >
      <div
        className={cn(
          'flex shrink-0 transition-all duration-300 justify-between items-center p-2',
          {
            'md:-rotate-90 md:origin-bottom-left md:w-[200px] md:translate-x-[43px] md:translate-y-[140px]':
              !compact && !filtersExpanded && !mobileCollapsible,
            '@[580px]/main-body:flex-col-reverse @[580px]/main-body:gap-4 @[580px]/main-body:px-0':
              compact && !filtersExpanded,
            'lg:-rotate-90 lg:origin-bottom-left lg:w-[200px] lg:translate-x-[43px] lg:translate-y-[140px]':
              !filtersExpanded && mobileCollapsible,
          },
        )}
      >
        <div
          className={cn(
            'whitespace-nowrap font-semibold tracking-tight',
            compact
              ? 'text-sm text-[var(--workspace-accent)] @max-[580px]/main-body:hidden'
              : 'text-2xl',
            compact && !filtersExpanded && '@[580px]/main-body:[writing-mode:vertical-rl]',
          )}
        >
          Search Filters
        </div>
        <div
          className={cn(
            'flex items-center gap-2',
            compact && '@max-[580px]/main-body:w-full @max-[580px]/main-body:justify-between',
          )}
        >
          {(mobileCollapsible || compact) && !onClose && (
            <Button
              variant="ghost"
              size="sm"
              className={compact ? '@[580px]/main-body:hidden' : 'lg:hidden'}
              disabled={disabled}
              aria-expanded={mobileExpanded}
              aria-label={mobileExpanded ? 'Hide search filters' : 'Show search filters'}
              onClick={() => {
                setMobileExpanded(!mobileExpanded);
                if (!filtersExpanded) setFiltersExpanded(true);
              }}
            >
              <Filter className="size-4" />
              {mobileExpanded ? 'Hide' : 'Filters'}
            </Button>
          )}
          {compact && footerElement && (
            <div className="@[580px]/main-body:hidden [&_a]:mt-0 [&_a]:h-8 [&_a]:px-2 [&_a]:text-xs">
              {footerElement}
            </div>
          )}
          <Button
            className={cn(
              mobileCollapsible && !onClose && 'max-lg:hidden',
              compact && '@max-[580px]/main-body:hidden',
            )}
            variant="ghost"
            size="sm"
            onClick={onClose ?? (() => setFiltersExpanded(!filtersExpanded))}
            aria-label={filtersExpanded ? 'Collapse filters' : 'Expand filters'}
            disabled={disabled}
            title={
              disabled
                ? 'Return to search results to use filters'
                : filtersExpanded
                  ? 'Collapse filters'
                  : 'Expand filters'
            }
            aria-expanded={filtersExpanded}
          >
            {filtersExpanded ? (
              <X className="h-4 w-4" />
            ) : (
              <Filter className={cn('h-4 w-4', !compact && 'md:rotate-90')} />
            )}
          </Button>
        </div>
      </div>
      {!filtersExpanded && (
        <div
          className={
            compact
              ? 'mt-2 @max-[580px]/main-body:hidden @[580px]/main-body:[&_a]:h-auto @[580px]/main-body:[&_a]:w-8 @[580px]/main-body:[&_a]:px-1 @[580px]/main-body:[&_a]:py-3 @[580px]/main-body:[&_a]:[writing-mode:vertical-rl]'
              : 'md:-rotate-90 md:origin-bottom-left md:w-[200px] md:translate-x-[37px] md:translate-y-[340px]'
          }
        >
          {footerElement}
        </div>
      )}

      {filtersExpanded && (
        <div
          className={cn(
            compact
              ? 'px-1 [&_input]:h-8 [&_input]:text-xs @[580px]/main-body:flex @[580px]/main-body:min-h-0 @[580px]/main-body:flex-1 @[580px]/main-body:flex-col'
              : 'px-2',
            compact && !mobileExpanded && '@max-[580px]/main-body:hidden',
            mobileCollapsible && !onClose && !mobileExpanded && 'max-lg:hidden',
          )}
        >
          <ScrollArea
            className={cn(
              footerElement
                ? 'h-[calc(var(--app-content-height,100vh)-215px)]'
                : 'h-[calc(var(--app-content-height,100vh)-165px)]',
              compact &&
                'h-[55dvh] @[580px]/main-body:h-auto @[580px]/main-body:min-h-0 @[580px]/main-body:flex-1',
            )}
          >
            <div className={cn('space-y-2 pr-4', compact && '[&_label]:text-xs')}>
              <Input
                id="name-search"
                aria-label="Search by card name"
                autoFocus={Boolean(onClose)}
                placeholder="Search by card name..."
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={createTextInputKeyDownHandler(() => setName(''))}
              />
              <Input
                id="text-search"
                aria-label="Search card text"
                placeholder="Search in card text, rules, deploy/epic text..."
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={createTextInputKeyDownHandler(() => setText(''))}
              />
              <div className="px-28">
                <Separator />
              </div>

              <MultiAspectFilter
                value={aspects}
                onChange={setAspects}
                multiSelect={true}
                multiMainAspects={true}
                showLabel={false}
                showAllOption={false}
                showNoneOption={false}
                className={cn(
                  'justify-center',
                  compact && '[&_button]:h-8 [&_button]:w-10 [&_button]:px-1',
                )}
              />
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`aspectsExact`}
                    checked={aspectsExact}
                    onCheckedChange={() => setAspectsExact(!aspectsExact)}
                    className={cn(
                      'w-4 h-4',
                      aspectsExact ? 'bg-primary text-primary-foreground' : 'bg-background',
                    )}
                  />
                  <Label htmlFor={`aspectsExact`}>Exact aspects</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`includeNoAspect`}
                    checked={includeNoAspect}
                    onCheckedChange={() => setIncludeNoAspect(!includeNoAspect)}
                    className={cn(
                      'w-4 h-4',
                      includeNoAspect ? 'bg-primary text-primary-foreground' : 'bg-background',
                    )}
                  />
                  <Label htmlFor={`includeNoAspect`}>
                    <span>No aspect</span>
                    <span
                      className={cn(
                        'ml-1 text-[10px] cursor-help',
                        aspectsExact && aspects.length > 0 ? 'visible' : 'invisible',
                      )}
                      title="Exact aspects setting takes precedence."
                    >
                      (ignored)
                    </span>
                  </Label>
                </div>
              </div>

              <GenericMultiSelect
                label="Card Types"
                placeholder="Select card types..."
                options={availableSearchCardTypes}
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

              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">Sets</span>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="xs"
                      variant={premierOnlySelected ? 'secondary' : 'outline'}
                      aria-pressed={premierOnlySelected}
                      title="Select sets currently legal in Premier"
                      onClick={() => setSets(togglePremierOnlySetSelection(sets))}
                    >
                      Premier
                    </Button>
                    <Tooltip open={previewTooltipOpen} onOpenChange={setPreviewTooltipOpen}>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          size="xs"
                          variant={futureSetsSelected ? 'secondary' : 'outline'}
                          aria-pressed={hasPreviewSets ? futureSetsSelected : undefined}
                          aria-disabled={!hasPreviewSets}
                          className="aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:bg-background aria-disabled:hover:text-foreground"
                          onClick={event => {
                            if (!hasPreviewSets) {
                              // Keep the tooltip trigger from closing the explanation after a tap.
                              event.preventDefault();
                              setPreviewTooltipOpen(true);
                              return;
                            }
                            setSets(toggleFutureSetSelection(sets));
                          }}
                        >
                          +Preview
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-64">
                        {hasPreviewSets
                          ? 'Add or remove preview sets'
                          : "We don't have any sets in preview currently."}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
                <SetMultiSelect
                  value={sets}
                  defaultValue={sets}
                  onChange={setSets}
                  showFullName={true}
                />
              </div>
              <RarityMultiSelect value={rarities} defaultValue={rarities} onChange={setRarities} />
              <RadioGroup
                value={uniqueness}
                onValueChange={value => setUniqueness(value as CardUniquenessFilter)}
                aria-label="Card uniqueness"
                className="grid grid-cols-3 gap-2 py-1"
              >
                {UNIQUENESS_OPTIONS.map(option => (
                  <div key={option.value} className="flex items-center justify-center space-x-2">
                    <RadioGroupItem value={option.value} id={`uniqueness-${option.value}`} />
                    <Label htmlFor={`uniqueness-${option.value}`}>{option.label}</Label>
                  </div>
                ))}
              </RadioGroup>

              <RangeFilter
                label="Upgrade Power"
                value={upgradePower}
                onChange={setUpgradePowerRange}
              />
              <RangeFilter label="Upgrade HP" value={upgradeHp} onChange={setUpgradeHpRange} />

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
              <Input
                id="artist-search"
                aria-label="Search by artist"
                placeholder="Search by artist..."
                value={artist}
                onChange={e => setArtist(e.target.value)}
                onKeyDown={createTextInputKeyDownHandler(() => setArtist(''))}
              />
            </div>
          </ScrollArea>

          <div
            className={cn(
              'pt-2 border-t justify-between',
              compact ? 'shrink-0' : 'flex-1',
              compact ? 'mt-2 border-[var(--workspace-border)]' : 'mt-4',
            )}
          >
            <div
              className={cn(
                'rounded-md',
                compact
                  ? 'bg-[var(--workspace-soft)] p-1.5 [&_button]:h-8 [&_button]:px-2 [&_button]:text-xs'
                  : 'p-2 bg-accent/50 dark:bg-primary/10',
              )}
            >
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium">Applied: {activeFiltersCount}</span>
                <div className="flex items-center gap-2">
                  {activeFiltersCount > 0 && (
                    <Button variant="secondary" onClick={resetFilters}>
                      <RefreshCcw className="mr-2 h-4 w-4" /> Reset All
                    </Button>
                  )}
                  <Button
                    onClick={() => {
                      onSearch();
                      if (mobileCollapsible || compact) setMobileExpanded(false);
                    }}
                    disabled={isSearching || isLoadingCardList}
                  >
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
          {compact ? (
            <div className="@max-[580px]/main-body:hidden">{footerElement}</div>
          ) : (
            footerElement
          )}
        </div>
      )}
    </div>
  );
};

export default AdvancedSearchFilters;

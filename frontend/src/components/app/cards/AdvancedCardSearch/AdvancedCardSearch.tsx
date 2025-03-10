import { useMemo } from 'react';
import { useCardList } from '@/api/lists/useCardList';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, Filter, Grid, List, X, RefreshCcw } from 'lucide-react';
import MultiAspectFilter from '@/components/app/global/MultiAspectFilter/MultiAspectFilter';
import CardImage from '@/components/app/global/CardImage';
import { selectDefaultVariant } from '@/lib/cards/selectDefaultVariant';
import {
  useAdvancedCardSearchStore,
  useAdvancedCardSearchStoreActions,
} from './useAdvancedCardSearchStore';
import { filterCards } from './searchService';
import { cn } from '@/lib/utils';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { useNavigate } from '@tanstack/react-router';
import { Route } from '@/routes/__root';
import { SwuArena } from '../../../../../../types/enums.ts';
import GenericMultiSelect from '../../global/GenericMultiSelect/GenericMultiSelect.tsx';
import RangeFilter from '@/components/app/global/RangeFilter/RangeFilter.tsx';

// Available card types
const CARD_TYPES = ['Leader', 'Base', 'Unit', 'Event', 'Upgrade'];

const AdvancedCardSearch: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate({ from: Route.fullPath });

  // Get card data
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
    searchResults,
    filtersExpanded,
    resultsView,
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
    setIsSearching,
    setSearchResults,
    setFiltersExpanded,
    setResultsView,
    resetFilters,
    saveFilters,
  } = useAdvancedCardSearchStoreActions();

  // Track if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      name !== '' ||
      text !== '' ||
      cardTypes.length > 0 ||
      aspects.length > 0 ||
      arenas.length > 0 ||
      traits.length > 0 ||
      keywords.length > 0 ||
      variants.length > 0 ||
      cost.min !== undefined ||
      cost.max !== undefined ||
      power.min !== undefined ||
      power.max !== undefined ||
      hp.min !== undefined ||
      hp.max !== undefined ||
      upgradePower.min !== undefined ||
      upgradePower.max !== undefined ||
      upgradeHp.min !== undefined ||
      upgradeHp.max !== undefined
    );
  }, [
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
  ]);

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

  // Execute search with current filters
  const handleSearch = async () => {
    if (!cardListData) {
      toast({
        title: 'Card data not available',
        description: 'Please try again when card data is loaded.',
        variant: 'destructive',
      });
      return;
    }

    setIsSearching(true);

    try {
      // Save filters for future use
      saveFilters();

      // Execute the search
      const results = await filterCards(cardListData.cards, cardListData.cardIds, {
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
      });

      setSearchResults(results);

      toast({
        title: 'Search completed',
        description: `Found ${results.length} cards matching your criteria.`,
      });
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: 'Search error',
        description: 'An error occurred while searching.',
        variant: 'destructive',
      });
      setSearchResults([]);
    }
  };

  const handleReset = () => {
    resetFilters();
    setSearchResults([]);
  };

  const handleViewCard = (cardId: string) => {
    navigate({
      search: prev => ({ ...prev, modalCardId: cardId }),
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Filters Panel */}
        <Card
          className={cn(
            'transition-all duration-300 overflow-hidden',
            filtersExpanded ? 'w-full md:w-1/3' : 'w-full md:w-auto',
          )}
        >
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Search Filters
              </CardTitle>
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
          </CardHeader>

          {filtersExpanded && (
            <CardContent className="pb-4">
              <ScrollArea className="h-[calc(100vh-280px)] pr-4">
                <div className="space-y-4">
                  {/* Text search fields */}
                  <div className="space-y-2">
                    <Label htmlFor="name-search">Card Name</Label>
                    <Input
                      id="name-search"
                      placeholder="Search by card name..."
                      value={name}
                      onChange={e => setName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
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
                          showLabel={true}
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
                    <AccordionItem value="traits">
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
                    <AccordionItem value="keywords">
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
                    <AccordionItem value="variants">
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
                    <AccordionItem value="numeric">
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
                  onClick={handleReset}
                  disabled={!hasActiveFilters}
                >
                  <RefreshCcw className="mr-2 h-4 w-4" /> Reset
                </Button>
                <Button onClick={handleSearch} disabled={isSearching || isLoadingCardList}>
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
            </CardContent>
          )}
        </Card>

        {/* Results Panel */}
        <Card className="flex-1">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                Search Results
                {searchResults.length > 0 && (
                  <span className="text-sm text-muted-foreground">
                    ({searchResults.length} cards)
                  </span>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant={resultsView === 'grid' ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => setResultsView('grid')}
                  title="Grid view"
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={resultsView === 'list' ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => setResultsView('list')}
                  title="List view"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingCardList ? (
              <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Loading card data...</span>
              </div>
            ) : isSearching ? (
              <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Searching...</span>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-96 text-center">
                <Search className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold">No results found</h3>
                <p className="text-muted-foreground max-w-md mt-2">
                  {hasActiveFilters
                    ? "Try adjusting your search filters to find what you're looking for."
                    : 'Use the filters on the left to search for cards.'}
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[calc(100vh-200px)]">
                {resultsView === 'grid' ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {searchResults.map(cardId => {
                      const card = cardListData?.cards[cardId];
                      if (!card) return null;

                      const defaultVariant = selectDefaultVariant(card);

                      return (
                        <div
                          key={cardId}
                          className="cursor-pointer hover:scale-105 transition-transform"
                          onClick={() => handleViewCard(cardId)}
                        >
                          <CardImage
                            card={card}
                            cardVariantId={defaultVariant}
                            size="w100"
                            backSideButton={false}
                          />
                          <div
                            className="mt-1 text-sm font-medium text-center truncate"
                            title={card.name}
                          >
                            {card.name}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {searchResults.map(cardId => {
                      const card = cardListData?.cards[cardId];
                      if (!card) return null;

                      const defaultVariant = selectDefaultVariant(card);

                      return (
                        <HoverCard key={cardId} openDelay={300} closeDelay={100}>
                          <HoverCardTrigger asChild>
                            <div
                              className="flex items-center p-2 rounded-md border cursor-pointer hover:bg-accent"
                              onClick={() => handleViewCard(cardId)}
                            >
                              <div className="w-12 h-12 mr-3 flex-shrink-0">
                                <CardImage
                                  card={card}
                                  cardVariantId={defaultVariant}
                                  size="w50"
                                  backSideButton={false}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{card.name}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {card.type}
                                  {card.cost !== null && ` • Cost: ${card.cost}`}
                                  {card.arenas.length > 0 && ` • ${card.arenas.join(', ')}`}
                                </p>
                              </div>
                              <div className="flex-shrink-0 text-xs text-muted-foreground">
                                {card.aspects.join(', ')}
                              </div>
                            </div>
                          </HoverCardTrigger>
                          <HoverCardContent side="right" className="p-0 border-0">
                            <CardImage card={card} cardVariantId={defaultVariant} size="w200" />
                          </HoverCardContent>
                        </HoverCard>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdvancedCardSearch;

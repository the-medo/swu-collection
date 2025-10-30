import { Store, useStore } from '@tanstack/react-store';
import { SwuAspect } from '../../../../../../types/enums';
import { SwuArena, SwuRarity, SwuSet } from '../../../../../../types/enums.ts';
import { RangeFilterType } from '@/components/app/global/RangeFilter/RangeFilter.tsx';
import { filterCards } from '@/components/app/cards/AdvancedCardSearch/searchService.ts';
import { toast } from '@/hooks/use-toast.ts';
import { CardListResponse } from '@/api/lists/useCardList.ts';
import { useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Route as RouteCardSearch, ZAdvancedSearchParams } from '@/routes/cards/search.tsx';
import { Route as RouteDeckbuilder } from '@/routes/decks/$deckId/edit.tsx';
import { CardLayoutType } from './AdvancedSearchResults/SearchCardLayout';
import { SortField, SortOrder } from './AdvancedSearchResults/useSearchCardTableColumns';

export enum SearchFrom {
  CARD_SEARCH = 'card-search',
  DECKBUILDER = 'deckbuilder',
}

const getSearchFromRoutes = (searchFrom: SearchFrom) => {
  if (searchFrom === SearchFrom.CARD_SEARCH) return RouteCardSearch.fullPath;
  if (searchFrom === SearchFrom.DECKBUILDER) return RouteDeckbuilder.fullPath;
  throw new Error('Invalid searchFrom');
};

// Define the store state shape
export interface AdvancedCardSearchStore {
  searchInitialized: boolean;

  // Text search
  name: string;
  text: string;

  // Set and Rarity filters
  sets: SwuSet[];
  rarities: SwuRarity[];

  // Type filters
  cardTypes: string[];

  // Attribute filters
  aspects: SwuAspect[];
  aspectsExact: boolean;
  arenas: SwuArena[];
  traits: string[];
  keywords: string[];
  variants: string[];

  // Numeric filters
  cost: RangeFilterType;
  power: RangeFilterType;
  hp: RangeFilterType;
  upgradePower: RangeFilterType;
  upgradeHp: RangeFilterType;

  // Search state
  isSearching: boolean;
  searchResults: string[]; // Array of card IDs

  // UI state
  filtersExpanded: boolean;
  resultsLayout: CardLayoutType;
  sortField: SortField;
  sortOrder: SortOrder;
}

// Default state values
const defaultState: AdvancedCardSearchStore = {
  searchInitialized: false,

  name: '',
  text: '',

  sets: [],
  rarities: [],

  cardTypes: [],

  aspects: [],
  aspectsExact: false,
  arenas: [],
  traits: [],
  keywords: [],
  variants: [],

  cost: {},
  power: {},
  hp: {},
  upgradePower: {},
  upgradeHp: {},

  isSearching: false,
  searchResults: [],

  filtersExpanded: true,
  resultsLayout: 'imageMedium',
  sortField: 'name',
  sortOrder: 'asc',
};

// Create the store
const store = new Store<AdvancedCardSearchStore>(defaultState);

// Helper function to parse range string (like "2-5") into RangeFilterType
const parseRangeString = (rangeStr?: string): RangeFilterType => {
  if (!rangeStr) return {};

  const [min, max] = rangeStr.split('-').map(Number);
  const result: RangeFilterType = {};

  if (!isNaN(min)) result.min = min;
  if (!isNaN(max)) result.max = max;

  return result;
};

// Helper function to stringify a RangeFilterType to "min-max" format
export const stringifyRange = (range: RangeFilterType): string | undefined => {
  if (!range.min && !range.max) return undefined;
  return `${range.min || ''}-${range.max || ''}`;
};

export const useInitializeStoreFromUrlParams = (
  searchFrom: SearchFrom = SearchFrom.CARD_SEARCH,
) => {
  const {
    name,
    text,
    sets,
    rarities,
    cardTypes,
    aspects,
    aspectsExact,
    arenas,
    traits,
    keywords,
    variants,
    cost,
    power,
    hp,
    upgradePower,
    upgradeHp,
  } = useSearch({ from: getSearchFromRoutes(searchFrom) });

  const init = () =>
    store.setState(state => ({
      ...state,
      searchInitialized: false,
      name: name ?? defaultState.name,
      text: text ?? defaultState.text,
      sets: (sets ?? defaultState.sets) as SwuSet[],
      rarities: (rarities ?? defaultState.rarities) as SwuRarity[],
      cardTypes: cardTypes ?? defaultState.cardTypes,
      aspects: (aspects ?? defaultState.aspects) as SwuAspect[],
      aspectsExact: (aspectsExact ?? defaultState.aspectsExact) as boolean,
      arenas: (arenas ?? defaultState.arenas) as SwuArena[],
      traits: traits ?? defaultState.traits,
      keywords: keywords ?? defaultState.keywords,
      variants: variants ?? defaultState.variants,
      cost: parseRangeString(cost) ?? defaultState.cost,
      power: parseRangeString(power) ?? defaultState.power,
      hp: parseRangeString(hp) ?? defaultState.hp,
      upgradePower: parseRangeString(upgradePower) ?? defaultState.upgradePower,
      upgradeHp: parseRangeString(upgradeHp) ?? defaultState.upgradeHp,
    }));

  useEffect(() => {
    init();
  }, [
    name,
    text,
    sets,
    rarities,
    cardTypes,
    aspects,
    aspectsExact,
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
};

// Actions
const setSearchInitialized = (searchInitialized: boolean) =>
  store.setState(state => ({ ...state, searchInitialized }));

// Text filters
const setName = (name: string) => store.setState(state => ({ ...state, name }));

const setText = (text: string) => store.setState(state => ({ ...state, text }));

// Sets and Rarities filters
const setSets = (sets: SwuSet[]) => store.setState(state => ({ ...state, sets }));

const setRarities = (rarities: SwuRarity[]) => store.setState(state => ({ ...state, rarities }));

// Type filters
const setCardTypes = (cardTypes: string[]) => store.setState(state => ({ ...state, cardTypes }));

// Attribute filters
const setAspects = (aspects: SwuAspect[]) => store.setState(state => ({ ...state, aspects }));

const setAspectsExact = (aspectsExact: boolean) =>
  store.setState(state => ({ ...state, aspectsExact }));

const setArenas = (arenas: SwuArena[]) => store.setState(state => ({ ...state, arenas }));

const setTraits = (traits: string[]) => store.setState(state => ({ ...state, traits }));

const setKeywords = (keywords: string[]) => store.setState(state => ({ ...state, keywords }));

const setVariants = (variants: string[]) => store.setState(state => ({ ...state, variants }));

// Numeric filters
const setCostRange = (cost: RangeFilterType) => store.setState(state => ({ ...state, cost }));

const setPowerRange = (power: RangeFilterType) => store.setState(state => ({ ...state, power }));

const setHpRange = (hp: RangeFilterType) => store.setState(state => ({ ...state, hp }));

const setUpgradePowerRange = (upgradePower: RangeFilterType) =>
  store.setState(state => ({ ...state, upgradePower }));

const setUpgradeHpRange = (upgradeHp: RangeFilterType) =>
  store.setState(state => ({ ...state, upgradeHp }));

// Search state
const setIsSearching = (isSearching: boolean) =>
  store.setState(state => ({ ...state, isSearching }));

const setSearchResults = (searchResults: string[]) =>
  store.setState(state => ({ ...state, searchResults, isSearching: false }));

// UI state
const setFiltersExpanded = (filtersExpanded: boolean) =>
  store.setState(state => ({ ...state, filtersExpanded }));

const setResultsLayout = (resultsLayout: CardLayoutType) =>
  store.setState(state => ({ ...state, resultsLayout }));

const setSortField = (sortField: SortField) => store.setState(state => ({ ...state, sortField }));

const setSortOrder = (sortOrder: SortOrder) => store.setState(state => ({ ...state, sortOrder }));

// Reset all filters
const resetFilters = () =>
  store.setState(state => ({
    ...defaultState,
    isSearching: state.isSearching,
    searchResults: state.searchResults,
    filtersExpanded: state.filtersExpanded,
    resultsLayout: state.resultsLayout,
    sortField: state.sortField,
    sortOrder: state.sortOrder,
  }));

// Access the store state
export function useAdvancedCardSearchStore(searchFrom: SearchFrom = SearchFrom.CARD_SEARCH) {
  const navigate = useNavigate({ from: getSearchFromRoutes(searchFrom) });
  const searchInitialized = useStore(store, state => state.searchInitialized);

  const searchParamsBasedOnRoute = useMemo(() => {
    switch (searchFrom) {
      case SearchFrom.DECKBUILDER:
        return {
          deckbuilder: true,
        };
      case SearchFrom.CARD_SEARCH:
      default:
        return {};
    }
  }, [searchFrom]);

  // Extract all the parts of the state we need
  const name = useStore(store, state => state.name);
  const text = useStore(store, state => state.text);

  const sets = useStore(store, state => state.sets);
  const rarities = useStore(store, state => state.rarities);

  const cardTypes = useStore(store, state => state.cardTypes);

  const aspects = useStore(store, state => state.aspects);
  const aspectsExact = useStore(store, state => state.aspectsExact);
  const arenas = useStore(store, state => state.arenas);
  const traits = useStore(store, state => state.traits);
  const keywords = useStore(store, state => state.keywords);
  const variants = useStore(store, state => state.variants);

  const cost = useStore(store, state => state.cost);
  const power = useStore(store, state => state.power);
  const hp = useStore(store, state => state.hp);
  const upgradePower = useStore(store, state => state.upgradePower);
  const upgradeHp = useStore(store, state => state.upgradeHp);

  const isSearching = useStore(store, state => state.isSearching);
  const searchResults = useStore(store, state => state.searchResults);

  const filtersExpanded = useStore(store, state => state.filtersExpanded);
  const resultsLayout = useStore(store, state => state.resultsLayout);
  const sortField = useStore(store, state => state.sortField);
  const sortOrder = useStore(store, state => state.sortOrder);

  // Calculate active filters count
  const activeFiltersCount = [
    name !== '',
    text !== '',
    sets.length > 0,
    rarities.length > 0,
    cardTypes.length > 0,
    aspects.length > 0,
    aspectsExact,
    arenas.length > 0,
    traits.length > 0,
    keywords.length > 0,
    variants.length > 0,
    cost.min !== undefined || cost.max !== undefined,
    power.min !== undefined || power.max !== undefined,
    hp.min !== undefined || hp.max !== undefined,
    upgradePower.min !== undefined || upgradePower.max !== undefined,
    upgradeHp.min !== undefined || upgradeHp.max !== undefined,
  ].filter(Boolean).length;

  const handleSearch = useCallback(
    async (cardListData: CardListResponse) => {
      setIsSearching(true);

      try {
        // Execute the search
        const results = await filterCards(cardListData.cards, cardListData.cardIds, {
          name,
          text,
          sets,
          rarities,
          cardTypes,
          aspects,
          aspectsExact,
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

        const searchParams: ZAdvancedSearchParams = {
          name: name || undefined,
          text: text || undefined,
          sets: sets.length ? sets : undefined,
          rarities: rarities.length ? rarities : undefined,
          cardTypes: cardTypes.length ? cardTypes : undefined,
          aspects: aspects.length ? aspects : undefined,
          aspectsExact: aspectsExact || undefined,
          arenas: arenas.length ? arenas : undefined,
          traits: traits.length ? traits : undefined,
          keywords: keywords.length ? keywords : undefined,
          variants: variants.length ? variants : undefined,
          cost: stringifyRange(cost),
          power: stringifyRange(power),
          hp: stringifyRange(hp),
          upgradePower: stringifyRange(upgradePower),
          upgradeHp: stringifyRange(upgradeHp),
          resultsLayout: resultsLayout || 'imageBig',
        };

        (Object.keys(searchParams) as (keyof ZAdvancedSearchParams)[]).forEach(key => {
          if (searchParams[key] === undefined) delete searchParams[key];
        });

        setSearchResults(results);
        navigate({
          search: () => ({ ...searchParams, ...searchParamsBasedOnRoute }),
        });

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
    },
    [
      name,
      text,
      sets,
      rarities,
      cardTypes,
      aspects,
      aspectsExact,
      arenas,
      traits,
      keywords,
      variants,
      cost,
      power,
      hp,
      upgradePower,
      upgradeHp,
      resultsLayout,
      searchParamsBasedOnRoute,
    ],
  );

  const hasActiveFilters =
    name !== '' ||
    text !== '' ||
    sets.length > 0 ||
    rarities.length > 0 ||
    cardTypes.length > 0 ||
    aspects.length > 0 ||
    aspectsExact ||
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
    upgradeHp.max !== undefined;

  return {
    searchInitialized,

    // Text search
    name,
    text,

    // Set and Rarity filters
    sets,
    rarities,

    // Type filters
    cardTypes,

    // Attribute filters
    aspects,
    aspectsExact,
    arenas,
    traits,
    keywords,
    variants,

    // Numeric filters
    cost,
    power,
    hp,
    upgradePower,
    upgradeHp,

    // Search and search state
    handleSearch,
    isSearching,
    searchResults,

    // UI state
    hasActiveFilters,
    activeFiltersCount,
    filtersExpanded,
    resultsLayout,
    sortField,
    sortOrder,

    // Actions
    setName,
    setText,
    setSets,
    setRarities,
    setCardTypes,
    setAspects,
    setAspectsExact,
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
    setResultsLayout,
    setSortField,
    setSortOrder,
    resetFilters,
  };
}

// Access the store actions
export function useAdvancedCardSearchStoreActions() {
  return {
    setSearchInitialized,

    // Text filters
    setName,
    setText,

    // Set and Rarity filters
    setSets,
    setRarities,

    // Type filters
    setCardTypes,

    // Attribute filters
    setAspects,
    setAspectsExact,
    setArenas,
    setTraits,
    setKeywords,
    setVariants,

    // Numeric filters
    setCostRange,
    setPowerRange,
    setHpRange,
    setUpgradePowerRange,
    setUpgradeHpRange,

    // UI state
    setFiltersExpanded,
    setResultsLayout,
    setSortField,
    setSortOrder,

    // Other actions
    resetFilters,
  };
}

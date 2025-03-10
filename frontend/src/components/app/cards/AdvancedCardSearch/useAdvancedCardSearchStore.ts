import { Store, useStore } from '@tanstack/react-store';
import { SwuAspect } from '../../../../../../types/enums';
import { SwuArena } from '../../../../../../types/enums.ts';
import { RangeFilterType } from '@/components/app/global/RangeFilter/RangeFilter.tsx';
import { filterCards } from '@/components/app/cards/AdvancedCardSearch/searchService.ts';
import { toast } from '@/hooks/use-toast.ts';
import { CardListResponse } from '@/api/lists/useCardList.ts';
import { useCallback, useEffect } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Route, ZAdvancedSearchParams } from '@/routes/cards/search.tsx';

// Define the store state shape
export interface AdvancedCardSearchStore {
  searchInitialized: boolean;

  // Text search
  name: string;
  text: string;

  // Type filters
  cardTypes: string[];

  // Attribute filters
  aspects: SwuAspect[];
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
  resultsView: 'grid' | 'list';
}

// Default state values
const defaultState: AdvancedCardSearchStore = {
  searchInitialized: false,

  name: '',
  text: '',

  cardTypes: [],

  aspects: [],
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
  resultsView: 'grid',
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

export const useInitializeStoreFromUrlParams = () => {
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
  } = useSearch({ from: Route.fullPath });

  const init = () =>
    store.setState(state => ({
      ...state,
      searchInitialized: false,
      name: name ?? defaultState.name,
      text: text ?? defaultState.text,
      cardTypes: cardTypes ?? defaultState.cardTypes,
      aspects: (aspects ?? defaultState.aspects) as SwuAspect[],
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
};

// Actions
const setSearchInitialized = (searchInitialized: boolean) =>
  store.setState(state => ({ ...state, searchInitialized }));

// Text filters
const setName = (name: string) => store.setState(state => ({ ...state, name }));

const setText = (text: string) => store.setState(state => ({ ...state, text }));

// Type filters
const setCardTypes = (cardTypes: string[]) => store.setState(state => ({ ...state, cardTypes }));

// Attribute filters
const setAspects = (aspects: SwuAspect[]) => store.setState(state => ({ ...state, aspects }));

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

const setResultsView = (resultsView: 'grid' | 'list') =>
  store.setState(state => ({ ...state, resultsView }));

// Reset all filters
const resetFilters = () =>
  store.setState(state => ({
    ...defaultState,
    isSearching: state.isSearching,
    searchResults: state.searchResults,
    filtersExpanded: state.filtersExpanded,
    resultsView: state.resultsView,
  }));

// Access the store state
export function useAdvancedCardSearchStore() {
  const navigate = useNavigate({ from: Route.fullPath });
  const searchInitialized = useStore(store, state => state.searchInitialized);

  // Extract all the parts of the state we need
  const name = useStore(store, state => state.name);
  const text = useStore(store, state => state.text);

  const cardTypes = useStore(store, state => state.cardTypes);

  const aspects = useStore(store, state => state.aspects);
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
  const resultsView = useStore(store, state => state.resultsView);

  const handleSearch = useCallback(
    async (cardListData: CardListResponse) => {
      setIsSearching(true);

      try {
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

        const searchParams: ZAdvancedSearchParams = {
          name: name || undefined,
          text: text || undefined,
          cardTypes: cardTypes.length ? cardTypes : undefined,
          aspects: aspects.length ? aspects : undefined,
          arenas: arenas.length ? arenas : undefined,
          traits: traits.length ? traits : undefined,
          keywords: keywords.length ? keywords : undefined,
          variants: variants.length ? variants : undefined,
          cost: stringifyRange(cost),
          power: stringifyRange(power),
          hp: stringifyRange(hp),
          upgradePower: stringifyRange(upgradePower),
          upgradeHp: stringifyRange(upgradeHp),
          view: resultsView,
        };

        (Object.keys(searchParams) as (keyof ZAdvancedSearchParams)[]).forEach(key => {
          if (searchParams[key] === undefined) delete searchParams[key];
        });

        setSearchResults(results);
        navigate({
          search: () => ({ ...searchParams }),
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
    ],
  );

  const hasActiveFilters =
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
    upgradeHp.max !== undefined;

  return {
    searchInitialized,

    // Text search
    name,
    text,

    // Type filters
    cardTypes,

    // Attribute filters
    aspects,
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
    filtersExpanded,
    resultsView,
  };
}

// Access the store actions
export function useAdvancedCardSearchStoreActions() {
  return {
    setSearchInitialized,

    // Text filters
    setName,
    setText,

    // Type filters
    setCardTypes,

    // Attribute filters
    setAspects,
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

    // Search state
    setIsSearching,
    setSearchResults,

    // UI state
    setFiltersExpanded,
    setResultsView,

    // Other actions
    resetFilters,
  };
}

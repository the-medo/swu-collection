import { Store, useStore } from '@tanstack/react-store';
import { SwuAspect } from '../../../../../../types/enums';
import { SwuArena } from '../../../../../../types/enums.ts';
import { RangeFilterType } from '@/components/app/global/RangeFilter/RangeFilter.tsx';

// Define the store state shape
export interface AdvancedCardSearchStore {
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

// Load saved filters from localStorage on initialization
try {
  const savedFilters = localStorage.getItem('advanced-card-search-filters');
  if (savedFilters) {
    const parsedFilters = JSON.parse(savedFilters);
    // Only update the filter values, not the search state
    store.setState(state => ({
      ...state,
      ...parsedFilters,
      isSearching: false,
      searchResults: [],
    }));
  }
} catch (error) {
  console.error('Failed to load saved filters:', error);
}

// Actions

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

// Save filters to localStorage
const saveFilters = () => {
  const state = store.state;
  const filtersToSave = {
    name: state.name,
    text: state.text,
    cardTypes: state.cardTypes,
    aspects: state.aspects,
    arenas: state.arenas,
    traits: state.traits,
    keywords: state.keywords,
    variants: state.variants,
    cost: state.cost,
    power: state.power,
    hp: state.hp,
    upgradePower: state.upgradePower,
    upgradeHp: state.upgradeHp,
    filtersExpanded: state.filtersExpanded,
    resultsView: state.resultsView,
  };

  localStorage.setItem('advanced-card-search-filters', JSON.stringify(filtersToSave));
};

// Access the store state
export function useAdvancedCardSearchStore() {
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

  return {
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

    // Search state
    isSearching,
    searchResults,

    // UI state
    filtersExpanded,
    resultsView,
  };
}

// Access the store actions
export function useAdvancedCardSearchStoreActions() {
  return {
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
    saveFilters,
  };
}

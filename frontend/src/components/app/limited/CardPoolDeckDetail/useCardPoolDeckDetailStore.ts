import { Store, useStore } from '@tanstack/react-store';
import { SwuAspect } from '../../../../../../types/enums.ts';

// Types
export type CPGroupBy = 'aspect' | 'type' | 'cost';
export type CPBoxedGroupBy = 'X' | CPGroupBy;
export type CPFilterAspects = 'showOnlyLeaderAndBaseAspects' | 'all' | SwuAspect;

export interface CardPoolDeckDetailStore {
  // UI state
  leadersAndBasesExpanded: boolean;
  selectedLeaderId: string;
  selectedBaseId: string;
  hoveredCardId: string;
  selectedCardIds: Partial<Record<number, true>>;
  showCardsInDeck: boolean;
  showRemovedCards: boolean;
  showUnfilteredCards: boolean;
  initialized: boolean;

  // Filters
  filterAspects: CPFilterAspects;
  exactAspects: boolean;
  filterCost: Partial<Record<number | 'all', true>>; // all,0,1,2,3,4,5,6 (6 = 6+)
  filterType: string[]; // Units, ground/space units, upgrades, events, 'all' etc.
  filterTraits: string[];
  filterKeywords: string[];

  // Content grouping
  contentBoxesBy: CPBoxedGroupBy;
  contentStacksBy: CPGroupBy;
}

const defaultState: CardPoolDeckDetailStore = {
  leadersAndBasesExpanded: false,
  selectedLeaderId: '',
  selectedBaseId: '',
  hoveredCardId: '',
  selectedCardIds: {},
  showCardsInDeck: true,
  showRemovedCards: false,
  showUnfilteredCards: false,
  initialized: false,

  filterAspects: 'all',
  exactAspects: false,
  filterCost: { all: true },
  filterType: [],
  filterTraits: [],
  filterKeywords: [],

  contentBoxesBy: 'aspect',
  contentStacksBy: 'type',
};

const store = new Store<CardPoolDeckDetailStore>(defaultState);

// Actions
const setLeadersAndBasesExpanded = (expanded: boolean) =>
  store.setState(state => ({ ...state, leadersAndBasesExpanded: expanded }));

const setInitialized = (value: boolean) => store.setState(s => ({ ...s, initialized: value }));

const setSelectedLeaderId = (id: string) => store.setState(s => ({ ...s, selectedLeaderId: id }));

const setSelectedBaseId = (id: string) => store.setState(s => ({ ...s, selectedBaseId: id }));

const setHoveredCardId = (id: string) => store.setState(s => ({ ...s, hoveredCardId: id }));

const addSelectedCardId = (id: number) =>
  store.setState(s => ({ ...s, selectedCardIds: { ...s.selectedCardIds, [id]: true } }));

const removeSelectedCardId = (id: number) =>
  store.setState(s => {
    const next = { ...s.selectedCardIds };
    delete next[id];
    return { ...s, selectedCardIds: next };
  });

const clearSelectedCardIds = () => store.setState(s => ({ ...s, selectedCardIds: {} }));

const toggleSelectedCardId = (id: number) =>
  store.setState(s => {
    const isSelected = !!s.selectedCardIds[id];
    if (isSelected) {
      const next = { ...s.selectedCardIds };
      delete next[id];
      return { ...s, selectedCardIds: next };
    }
    return { ...s, selectedCardIds: { ...s.selectedCardIds, [id]: true } };
  });

// Select multiple card pool IDs at once
const selectManyCardIds = (ids: number[]) =>
  store.setState(s => {
    if (!ids?.length) return s;
    const next = { ...s.selectedCardIds } as Partial<Record<number, true>>;
    for (const id of ids) {
      if (typeof id === 'number') next[id] = true;
    }
    return { ...s, selectedCardIds: next };
  });

// Deselect multiple card pool IDs at once
const deselectManyCardIds = (ids: number[]) =>
  store.setState(s => {
    if (!ids?.length) return s;
    const next = { ...s.selectedCardIds } as Partial<Record<number, true>>;
    for (const id of ids) {
      if (typeof id === 'number' && next[id]) delete next[id];
    }
    return { ...s, selectedCardIds: next };
  });

const setShowCardsInDeck = (value: boolean) =>
  store.setState(s => ({ ...s, showCardsInDeck: value }));

const setShowRemovedCards = (value: boolean) =>
  store.setState(s => ({ ...s, showRemovedCards: value }));

const setShowUnfilteredCards = (value: boolean) =>
  store.setState(s => ({ ...s, showUnfilteredCards: value }));

const setFilterAspects = (value: CPFilterAspects) =>
  store.setState(s => ({ ...s, filterAspects: value }));

const setFilterCost = (value: Partial<Record<number | 'all', true>>) =>
  store.setState(s => ({ ...s, filterCost: value }));

const setExactAspects = (value: boolean) => store.setState(s => ({ ...s, exactAspects: value }));

const setFilterType = (value: string[]) => store.setState(s => ({ ...s, filterType: value }));

const setFilterTraits = (value: string[]) => store.setState(s => ({ ...s, filterTraits: value }));

const setFilterKeywords = (value: string[]) =>
  store.setState(s => ({ ...s, filterKeywords: value }));

const setContentBoxesBy = (value: CPBoxedGroupBy) =>
  store.setState(s => ({ ...s, contentBoxesBy: value }));

const setContentStacksBy = (value: CPGroupBy) =>
  store.setState(s => ({ ...s, contentStacksBy: value }));

const resetFilters = () =>
  store.setState(s => ({
    ...s,
    filterAspects: defaultState.filterAspects,
    exactAspects: defaultState.exactAspects,
    filterCost: defaultState.filterCost,
    filterType: defaultState.filterType,
    filterTraits: defaultState.filterTraits,
    filterKeywords: defaultState.filterKeywords,
    showRemovedCards: defaultState.showRemovedCards,
    showUnfilteredCards: defaultState.showUnfilteredCards,
  }));

const resetViewAndSelection = () =>
  store.setState(s => ({
    ...s,
    leadersAndBasesExpanded: defaultState.leadersAndBasesExpanded,
    selectedLeaderId: defaultState.selectedLeaderId,
    selectedBaseId: defaultState.selectedBaseId,
    hoveredCardId: defaultState.hoveredCardId,
    selectedCardIds: defaultState.selectedCardIds,
    showCardsInDeck: defaultState.showCardsInDeck,
  }));

const resetAll = () => store.setState(() => ({ ...defaultState }));

// Hook to consume state
export function useCardPoolDeckDetailStore() {
  const leadersAndBasesExpanded = useStore(store, s => s.leadersAndBasesExpanded);
  const selectedLeaderId = useStore(store, s => s.selectedLeaderId);
  const selectedBaseId = useStore(store, s => s.selectedBaseId);
  const hoveredCardId = useStore(store, s => s.hoveredCardId);
  const selectedCardIds = useStore(store, s => s.selectedCardIds);
  const showCardsInDeck = useStore(store, s => s.showCardsInDeck);
  const showRemovedCards = useStore(store, s => s.showRemovedCards);
  const showUnfilteredCards = useStore(store, s => s.showUnfilteredCards);
  const initialized = useStore(store, s => s.initialized);

  const filterAspects = useStore(store, s => s.filterAspects);
  const exactAspects = useStore(store, s => s.exactAspects);
  const filterCost = useStore(store, s => s.filterCost);
  const filterType = useStore(store, s => s.filterType);
  const filterTraits = useStore(store, s => s.filterTraits);
  const filterKeywords = useStore(store, s => s.filterKeywords);

  const contentBoxesBy = useStore(store, s => s.contentBoxesBy);
  const contentStacksBy = useStore(store, s => s.contentStacksBy);

  // Derived values similar to useDeckFilterStore
  const activeFiltersCount = [
    filterAspects !== 'all',
    // cost: if only 'all' is selected or empty => no active filter
    Object.keys(filterCost).some(k => k !== 'all'),
    filterType.length > 0,
    filterTraits.length > 0,
    filterKeywords.length > 0,
  ].filter(Boolean).length;

  const hasActiveFilters = activeFiltersCount > 0;

  return {
    leadersAndBasesExpanded,
    selectedLeaderId,
    selectedBaseId,
    hoveredCardId,
    selectedCardIds,
    showCardsInDeck,
    showRemovedCards,
    showUnfilteredCards,
    initialized,

    filterAspects,
    exactAspects,
    filterCost,
    filterType,
    filterTraits,
    filterKeywords,

    contentBoxesBy,
    contentStacksBy,

    activeFiltersCount,
    hasActiveFilters,
  };
}

// Hook to expose actions
export function useCardPoolDeckDetailStoreActions() {
  return {
    setLeadersAndBasesExpanded,
    setInitialized,
    setSelectedLeaderId,
    setSelectedBaseId,
    setHoveredCardId,
    addSelectedCardId,
    removeSelectedCardId,
    clearSelectedCardIds,
    toggleSelectedCardId,
    selectManyCardIds,
    deselectManyCardIds,
    setShowCardsInDeck,
    setShowRemovedCards,
    setShowUnfilteredCards,
    setFilterAspects,
    setFilterCost,
    setExactAspects,
    setFilterType,
    setFilterTraits,
    setFilterKeywords,
    setContentBoxesBy,
    setContentStacksBy,
    resetFilters,
    resetViewAndSelection,
    resetAll,
  } as const;
}

import { Store, useStore } from '@tanstack/react-store';
import { SwuAspect } from '../../../../../../types/enums.ts';
import { GetDecksRequest } from '@/api/decks/useGetDecks.ts';
import { DeckSortField } from '../../../../../../types/ZDeck.ts';
import { useCallback } from 'react';
import type { DeckQueryParams } from '../../../../../../server/routes/decks/get.ts';

export type SortOrder = 'asc' | 'desc';

export interface DeckFilterStore {
  // Filter state
  leaders: string[];
  base: string | undefined;
  aspects: SwuAspect[];
  format: number | undefined;

  // Sorting state
  sortField: string;
  sortOrder: SortOrder;
}

const defaultState: DeckFilterStore = {
  leaders: [],
  base: undefined,
  aspects: [],
  format: undefined,

  sortField: DeckSortField.UPDATED_AT,
  sortOrder: 'desc',
};

const store = new Store<DeckFilterStore>(defaultState);

// Actions
const setLeaders = (leaders: string[]) => store.setState(state => ({ ...state, leaders }));

const setBase = (base: string | undefined) => store.setState(state => ({ ...state, base }));

const setAspects = (aspects: SwuAspect[]) => store.setState(state => ({ ...state, aspects }));

const setFormat = (format: number | undefined) => store.setState(state => ({ ...state, format }));

const setSortField = (sortField: string) => store.setState(state => ({ ...state, sortField }));

const setSortOrder = (sortOrder: SortOrder) => store.setState(state => ({ ...state, sortOrder }));

const resetFilters = () =>
  store.setState(state => ({
    ...defaultState,
    sortField: state.sortField,
    sortOrder: state.sortOrder,
  }));

export function useDeckFilterStore() {
  const leaders = useStore(store, state => state.leaders);
  const base = useStore(store, state => state.base);
  const aspects = useStore(store, state => state.aspects);
  const format = useStore(store, state => state.format);

  const sortField = useStore(store, state => state.sortField);
  const sortOrder = useStore(store, state => state.sortOrder);

  // Calculate active filters count
  const activeFiltersCount = [
    leaders.length > 0,
    base !== undefined,
    aspects.length > 0,
    format !== undefined,
  ].filter(Boolean).length;

  const hasActiveFilters = activeFiltersCount > 0;

  // Convert to API request format
  const toRequestParams = useCallback(
    (): GetDecksRequest => ({
      leaders: leaders.length > 0 ? leaders : undefined,
      base,
      aspects: aspects.length > 0 ? aspects : undefined,
      format,
      sort: (sortField as DeckQueryParams['sort']) ?? undefined,
      order: sortOrder,
    }),
    [leaders, base, aspects, format, sortField, sortOrder],
  );

  return {
    // Filter state
    leaders,
    base,
    aspects,
    format,

    // Sorting state
    sortField,
    sortOrder,

    // Calculated values
    activeFiltersCount,
    hasActiveFilters,

    // Conversion
    toRequestParams,
  };
}

export function useDeckFilterStoreActions() {
  return {
    setLeaders,
    setBase,
    setAspects,
    setFormat,
    setSortField,
    setSortOrder,
    resetFilters,
  };
}

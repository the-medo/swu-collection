import { Store, useStore } from '@tanstack/react-store';
import { SwuAspect } from '../../../../../../types/enums.ts';
import { GetDecksRequest } from '@/api/decks/useGetDecks.ts';
import { DeckSortField } from '../../../../../../types/ZDeck.ts';
import { useCallback, useEffect, useState } from 'react';
import type { DeckQueryParams } from '../../../../../../server/routes/decks/get.ts';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Route, GlobalSearchParams } from '@/routes/__root.tsx';

export type SortOrder = 'asc' | 'desc';

export interface DeckFilterStore {
  // Flag to track initialization state
  initialized: boolean;

  // Filter state
  leaders: string[];
  base: string | undefined;
  aspects: SwuAspect[];
  format: number | undefined;

  // Sorting state
  sortField?: string;
  sortOrder?: SortOrder;
}

const defaultState: DeckFilterStore = {
  initialized: false,
  leaders: [],
  base: undefined,
  aspects: [],
  format: undefined,

  sortField: DeckSortField.UPDATED_AT,
  sortOrder: 'desc',
};

const store = new Store<DeckFilterStore>(defaultState);

export function useInitializeDeckFilterFromUrlParams(sortable?: boolean) {
  // const initialized = useStore(store, state => state.initialized);

  const { deckLeaders, deckBase, deckAspects, deckFormat, deckSort, deckOrder } = useSearch({
    strict: false,
  });
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    setInitialized(true);

    store.setState(state => ({
      ...state,
      initialized: true,
      leaders: deckLeaders ?? defaultState.leaders,
      base: deckBase ?? defaultState.base,
      aspects: deckAspects ?? defaultState.aspects,
      format: deckFormat ?? defaultState.format,
    }));

    if (sortable) {
      store.setState(state => ({
        ...state,
        sortField: deckSort ?? defaultState.sortField,
        sortOrder: deckOrder ?? defaultState.sortOrder,
      }));
    }

    return () => {
      store.setState(state => ({
        ...state,
        initialized: false,
      }));
    };
  }, []);

  return initialized;
}

// Actions
const setInitialized = (initialized: boolean) =>
  store.setState(state => ({ ...state, initialized }));

const setLeaders = (leaders: string[]) => store.setState(state => ({ ...state, leaders }));

const setBase = (base: string | undefined) => store.setState(state => ({ ...state, base }));

const setAspects = (aspects: SwuAspect[]) => store.setState(state => ({ ...state, aspects }));

const setFormat = (format: number | undefined) => store.setState(state => ({ ...state, format }));

const setSortField = (sortField: string) => store.setState(state => ({ ...state, sortField }));

const setSortOrder = (sortOrder: SortOrder) => store.setState(state => ({ ...state, sortOrder }));

const resetFilters = () =>
  store.setState(state => ({
    ...defaultState,
    initialized: true,
    sortField: state.sortField,
    sortOrder: state.sortOrder,
  }));

export function useDeckFilterStore(sortable?: boolean) {
  const navigate = useNavigate({ from: Route.fullPath });

  const initialized = useStore(store, state => state.initialized);
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

  // Sync URL with store state
  useEffect(() => {
    if (initialized) {
      const searchParams: Partial<GlobalSearchParams> = {
        deckLeaders: leaders.length > 0 ? leaders : undefined,
        deckBase: base,
        deckAspects: aspects.length > 0 ? aspects : undefined,
        deckFormat: format,
      };

      if (sortable) {
        searchParams.deckSort = sortField as GlobalSearchParams['deckSort'];
        searchParams.deckOrder = sortOrder as 'asc' | 'desc';
      }

      // Clean up undefined values
      Object.entries(searchParams).forEach(([key, value]) => {
        if (value === undefined) {
          delete searchParams[key as keyof GlobalSearchParams];
        }
      });

      void navigate({
        search: old => {
          // Create a new object without any deck filter params
          const filteredOld = { ...old };
          ['deckLeaders', 'deckBase', 'deckAspects', 'deckFormat', 'deckSort', 'deckOrder'].forEach(
            key => {
              delete filteredOld[key as keyof GlobalSearchParams];
            },
          );

          // Return the filtered old params with the new ones
          return { ...filteredOld, ...searchParams };
        },
        replace: true,
      });
    }
  }, [initialized, leaders, base, aspects, format, sortField, sortOrder]);

  // Convert to API request format
  const toRequestParams = useCallback(
    (userId?: string): GetDecksRequest => ({
      userId,
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
    setInitialized,
    setLeaders,
    setBase,
    setAspects,
    setFormat,
    setSortField,
    setSortOrder,
    resetFilters,
  };
}

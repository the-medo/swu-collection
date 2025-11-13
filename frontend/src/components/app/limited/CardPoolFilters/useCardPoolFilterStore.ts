import { Store, useStore } from '@tanstack/react-store';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import type { GetCardPoolsRequest } from '@/api/card-pools/useGetCardPools.ts';
import { CardPoolType } from '../../../../../../shared/types/cardPools.ts';

export type SortOrder = 'asc' | 'desc';
export type CardPoolSortField = 'created_at' | 'updated_at';

export interface CardPoolFilterStore {
  // init flag
  initialized: boolean;

  // filters
  set?: string;
  type?: CardPoolType;
  custom?: boolean;
  leader?: string; // prepared for future

  // sorting
  sortField?: CardPoolSortField;
  sortOrder?: SortOrder;
}

const defaultState: CardPoolFilterStore = {
  initialized: false,
  set: undefined,
  type: undefined,
  custom: false,
  leader: undefined,
  sortField: 'updated_at',
  sortOrder: 'desc',
};

const store = new Store<CardPoolFilterStore>(defaultState);

export function useInitializeCardPoolFilterFromUrlParams(sortable?: boolean) {
  const { poolSet, poolType, poolCustom, poolLeader, poolSort, poolOrder } = useSearch({
    strict: false,
  });
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    setInitialized(true);

    store.setState(state => ({
      ...state,
      initialized: true,
      set: poolSet ?? defaultState.set,
      type: poolType ?? defaultState.type,
      custom: poolCustom ?? defaultState.custom,
      leader: poolLeader ?? defaultState.leader,
    }));

    if (sortable) {
      store.setState(state => ({
        ...state,
        sortField: (poolSort as CardPoolSortField) ?? defaultState.sortField,
        sortOrder: (poolOrder as SortOrder) ?? defaultState.sortOrder,
      }));
    }

    return () => {
      store.setState(state => ({ ...state, initialized: false }));
    };
  }, []);

  return initialized;
}

// actions
const setInitialized = (initialized: boolean) => store.setState(s => ({ ...s, initialized }));
const setSet = (v: string | undefined) => store.setState(s => ({ ...s, set: v }));
const setType = (v: CardPoolType | undefined) => store.setState(s => ({ ...s, type: v }));
const setCustom = (v: boolean) => store.setState(s => ({ ...s, custom: v }));
const setLeader = (v: string | undefined) => store.setState(s => ({ ...s, leader: v }));
const setSortField = (v: CardPoolSortField) => store.setState(s => ({ ...s, sortField: v }));
const setSortOrder = (v: SortOrder) => store.setState(s => ({ ...s, sortOrder: v }));
const resetFilters = () =>
  store.setState(state => ({
    ...defaultState,
    initialized: true,
    sortField: state.sortField,
    sortOrder: state.sortOrder,
  }));

export function useCardPoolFilterStore(sortable?: boolean) {
  const navigate = useNavigate();

  const initialized = useStore(store, s => s.initialized);
  const setValue = useStore(store, s => s.set);
  const type = useStore(store, s => s.type);
  const custom = useStore(store, s => s.custom);
  const leader = useStore(store, s => s.leader);
  const sortField = useStore(store, s => s.sortField);
  const sortOrder = useStore(store, s => s.sortOrder);

  const activeFiltersCount = [
    setValue !== undefined,
    type !== undefined,
    custom === true,
    leader !== undefined,
  ].filter(Boolean).length;

  const hasActiveFilters = activeFiltersCount > 0;

  useEffect(() => {
    if (initialized) {
      const searchParams: Record<string, unknown> = {
        poolSet: setValue,
        poolType: type,
        poolCustom: custom ? true : undefined,
        poolLeader: leader,
      };

      if (sortable) {
        searchParams.poolSort = sortField;
        searchParams.poolOrder = sortOrder;
      }

      Object.entries(searchParams).forEach(([k, v]) => {
        if (v === undefined) delete searchParams[k];
      });

      void navigate({
        to: '.',
        search: old => {
          const filteredOld: Record<string, unknown> = { ...(old as any) };
          ['poolSet', 'poolType', 'poolCustom', 'poolLeader', 'poolSort', 'poolOrder'].forEach(
            key => delete filteredOld[key],
          );
          return { ...filteredOld, ...searchParams } as any;
        },
        replace: true,
      });
    }
  }, [initialized, setValue, type, custom, leader, sortField, sortOrder]);

  const toRequestParams = useCallback(
    (): GetCardPoolsRequest => ({
      set: setValue,
      type,
      sort: (sortField as GetCardPoolsRequest['sort']) ?? undefined,
      order: sortOrder,
    }),
    [setValue, type, sortField, sortOrder],
  );

  return {
    set: setValue,
    type,
    custom,
    leader,
    sortField,
    sortOrder,
    activeFiltersCount,
    hasActiveFilters,
    toRequestParams,
  };
}

export function useCardPoolFilterStoreActions() {
  return {
    setInitialized,
    setSet,
    setType,
    setCustom,
    setLeader,
    setSortField,
    setSortOrder,
    resetFilters,
  };
}

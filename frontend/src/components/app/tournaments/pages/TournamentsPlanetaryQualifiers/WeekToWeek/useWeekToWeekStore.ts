import { Store, useStore } from '@tanstack/react-store';
import { useSearch } from '@tanstack/react-router';

interface WeekToWeekStore {
  weekIdToCompare: string | null;
  deckKey: string | null;
  hoveredRowKey: string | null;
}

const defaultState: WeekToWeekStore = {
  weekIdToCompare: null,
  deckKey: null,
  hoveredRowKey: null,
};

const store = new Store<WeekToWeekStore>(defaultState);

const setWeekIdToCompare = (weekIdToCompare: string | null) =>
  store.setState(state => ({ ...state, weekIdToCompare }));

const setDeckKey = (deckKey: string | null) => store.setState(state => ({ ...state, deckKey }));

const setHoveredRowKey = (hoveredRowKey: string | null) =>
  store.setState(state => ({ ...state, hoveredRowKey }));

export function useWeekToWeekStore() {
  const weekIdToCompare = useStore(store, state => state.weekIdToCompare);
  const deckKey = useStore(store, state => state.deckKey);
  const hoveredRowKey = useStore(store, state => state.hoveredRowKey);
  const { pqSideStatView = 'week' } = useSearch({ strict: false });

  return {
    weekIdToCompare,
    deckKey,
    hoveredRowKey,
    pqSideStatView,
  };
}

export function useWeekToWeekStoreActions() {
  return {
    setWeekIdToCompare,
    setDeckKey,
    setHoveredRowKey,
  };
}

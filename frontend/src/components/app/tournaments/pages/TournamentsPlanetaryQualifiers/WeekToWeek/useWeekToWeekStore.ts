import { Store, useStore } from '@tanstack/react-store';

interface WeekToWeekStore {
  weekIdToCompare: string | null;
  deckKey: string | null;
}

const defaultState: WeekToWeekStore = {
  weekIdToCompare: null,
  deckKey: null,
};

const store = new Store<WeekToWeekStore>(defaultState);

const setWeekIdToCompare = (weekIdToCompare: string | null) => 
  store.setState(state => ({ ...state, weekIdToCompare }));

const setDeckKey = (deckKey: string | null) => 
  store.setState(state => ({ ...state, deckKey }));

export function useWeekToWeekStore() {
  const weekIdToCompare = useStore(store, state => state.weekIdToCompare);
  const deckKey = useStore(store, state => state.deckKey);

  return {
    weekIdToCompare,
    deckKey,
  };
}

export function useWeekToWeekStoreActions() {
  return {
    setWeekIdToCompare,
    setDeckKey,
  };
}

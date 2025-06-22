import { Store, useStore } from '@tanstack/react-store';

interface WeekToWeekStore {
  weekIdToCompare: string | null;
}

const defaultState: WeekToWeekStore = {
  weekIdToCompare: null,
};

const store = new Store<WeekToWeekStore>(defaultState);

const setWeekIdToCompare = (weekIdToCompare: string | null) => 
  store.setState(state => ({ ...state, weekIdToCompare }));

export function useWeekToWeekStore() {
  const weekIdToCompare = useStore(store, state => state.weekIdToCompare);

  return {
    weekIdToCompare,
  };
}

export function useWeekToWeekStoreActions() {
  return {
    setWeekIdToCompare,
  };
}
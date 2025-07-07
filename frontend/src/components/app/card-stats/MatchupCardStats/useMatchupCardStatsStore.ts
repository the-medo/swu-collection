import { Store, useStore } from '@tanstack/react-store';

// Define the store interface
interface MatchupCardStatsStore {
  selectedCardId: string | null;
}

// Define default state
const defaultState: MatchupCardStatsStore = {
  selectedCardId: null,
};

// Create the store
const store = new Store<MatchupCardStatsStore>(defaultState);

// Action to set the selected card ID
const setSelectedCardId = (selectedCardId: string | null) =>
  store.setState(state => ({
    ...state,
    selectedCardId,
  }));

// Hook to access the store state
export function useMatchupCardStatsStore() {
  const selectedCardId = useStore(store, state => state.selectedCardId);

  return {
    selectedCardId,
  };
}

// Hook to access the store actions
export function useMatchupCardStatsStoreActions() {
  return {
    setSelectedCardId,
  };
}
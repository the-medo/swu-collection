import { Store, useStore } from '@tanstack/react-store';

// Define the store interface
interface MatchupCardStatsStore {
  selectedCardId: string | null;
  hoveredCardId: string | null;
}

// Define default state
const defaultState: MatchupCardStatsStore = {
  selectedCardId: null,
  hoveredCardId: null,
};

// Create the store
const store = new Store<MatchupCardStatsStore>(defaultState);

// Action to set the selected card ID
const setSelectedCardId = (selectedCardId: string | null) =>
  store.setState(state => ({
    ...state,
    selectedCardId,
  }));

const setHoveredCardId = (hoveredCardId: string | null) =>
  store.setState(state => ({
    ...state,
    hoveredCardId,
  }));

// Hook to access the store state
export function useMatchupCardStatsStore() {
  const selectedCardId = useStore(store, state => state.selectedCardId);
  const hoveredCardId = useStore(store, state => state.hoveredCardId);

  return {
    selectedCardId: hoveredCardId ?? selectedCardId,
  };
}

// Hook to access the store actions
export function useMatchupCardStatsStoreActions() {
  return {
    setSelectedCardId,
    setHoveredCardId,
  };
}

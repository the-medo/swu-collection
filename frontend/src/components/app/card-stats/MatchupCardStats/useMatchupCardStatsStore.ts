import { Store, useStore } from '@tanstack/react-store';

// Define the store interface
interface MatchupCardStatsStore {
  selectedCardId: string | null;
  hoveredCardId: string | null;
  overviewId: string | null;
  matchupStatDeckKey: string | null;
}

// Define default state
const defaultState: MatchupCardStatsStore = {
  selectedCardId: null,
  hoveredCardId: null,
  overviewId: null,
  matchupStatDeckKey: null,
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

const setOverviewId = (overviewId: string | null) =>
  store.setState(state => ({
    ...state,
    overviewId,
  }));

const setMatchupStatDeckKey = (matchupStatDeckKey: string | null) =>
  store.setState(state => ({
    ...state,
    matchupStatDeckKey,
  }));

// Hook to access the store state
export function useMatchupCardStatsStore() {
  const selectedCardId = useStore(store, state => state.selectedCardId);
  const hoveredCardId = useStore(store, state => state.hoveredCardId);
  const overviewId = useStore(store, state => state.overviewId);
  const matchupStatDeckKey = useStore(store, state => state.matchupStatDeckKey);

  return {
    selectedCardId: hoveredCardId ?? selectedCardId,
    overviewId,
    matchupStatDeckKey,
  };
}

// Hook to access the store actions
export function useMatchupCardStatsStoreActions() {
  return {
    setSelectedCardId,
    setHoveredCardId,
    setOverviewId,
    setMatchupStatDeckKey,
  };
}

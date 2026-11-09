import { createContext, useContext } from 'react';
import type { CardDeckCounts } from '../../../../../shared/lib/cardDeckCounts.ts';

interface DeckCountsState {
  counts?: CardDeckCounts;
  isLoading: boolean;
  error: Error | null;
}

export const CardStatsDeckCountsContext = createContext<DeckCountsState>({
  isLoading: false,
  error: null,
});
export const useCardStatsDeckCounts = () => useContext(CardStatsDeckCountsContext);

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import {
  getGameResultsByScopeAndDateRange,
  storeGameResults,
  type GameResultStore,
} from '@/dexie/gameResults';
import type { GameResult } from '../../../../server/db/schema/game_result';
import { CardMetrics } from '../../../../shared/types/cardMetrics.ts';

const GAME_RESULTS_LAST_UPDATED_KEY = 'game-results-last-updated';

interface GameResultsLastUpdated {
  [scopeId: string]: string; // scopeId -> datetime ISO string
}

function getLastUpdatedFromStorage(): GameResultsLastUpdated {
  try {
    const stored = localStorage.getItem(GAME_RESULTS_LAST_UPDATED_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function setLastUpdatedInStorage(scopeId: string, datetime: string): void {
  try {
    const current = getLastUpdatedFromStorage();
    current[scopeId] = datetime;
    localStorage.setItem(GAME_RESULTS_LAST_UPDATED_KEY, JSON.stringify(current));
  } catch {
    // Ignore storage errors
  }
}

interface UseGetGameResultsParams {
  datetimeFrom?: string;
  datetimeTo?: string;
  teamId?: string;
}

/**
 * Hook to fetch and cache game results.
 * - Gets "game-results-last-updated" from localStorage
 * - Calls gameResultGetRoute endpoint with datetimeFrom + teamId to fetch missing game results
 * - Adds or replaces game data in Dexie if their "updated_at" is higher
 * - Returns appropriate game results for given timeframe
 */
export const useGetGameResults = (params: UseGetGameResultsParams = {}) => {
  const { datetimeFrom, datetimeTo, teamId } = params;

  // Determine the scope: teamId if provided, otherwise 'user' for personal games
  const scopeId = teamId ?? 'user';

  return useQuery<GameResultStore[]>({
    queryKey: ['game-results', scopeId, datetimeFrom, datetimeTo],
    queryFn: async () => {
      // Get last updated timestamp from localStorage for this scope
      const lastUpdatedMap = getLastUpdatedFromStorage();
      const lastUpdated = lastUpdatedMap[scopeId];

      // Determine the datetime to fetch from
      // If we have a lastUpdated, use it to only fetch newer records
      // Otherwise, use the provided datetimeFrom or fetch all
      const fetchFrom = lastUpdated ?? datetimeFrom;

      // Fetch from API
      const response = await api['game-results'].$get({
        query: {
          datetimeFrom: fetchFrom,
          datetimeTo,
          teamId,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch game results');
      }

      const apiResults = (await response.json()) as GameResult[];

      // Transform API results to store format (add scopeId)
      const resultsToStore: GameResultStore[] = apiResults.map(result => ({
        ...result,
        scopeId,
        cardMetrics: result.cardMetrics as CardMetrics,
        roundMetrics: result.roundMetrics as Record<string, unknown>,
        otherData: result.otherData as Record<string, unknown>,
      }));

      // Store in Dexie (only updates if newer)
      if (resultsToStore.length > 0) {
        await storeGameResults(resultsToStore);

        // Update the last updated timestamp in localStorage
        // Find the most recent updatedAt from the fetched results
        const mostRecentUpdatedAt = resultsToStore.reduce((latest, result) => {
          return result.updatedAt! > latest! ? result.updatedAt! : latest;
        }, resultsToStore[0].updatedAt!);

        setLastUpdatedInStorage(scopeId, mostRecentUpdatedAt);
      }

      // Return game results from Dexie for the requested date range
      // This ensures we return all cached data, not just what was fetched
      const cachedResults = await getGameResultsByScopeAndDateRange(
        scopeId,
        datetimeFrom,
        datetimeTo,
      );

      return cachedResults;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

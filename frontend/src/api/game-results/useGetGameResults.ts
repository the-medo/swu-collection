import { skipToken, useQuery } from '@tanstack/react-query';
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
  userId?: string;
  enabled?: boolean;
}

/**
 * Hook to fetch and cache game results.
 * - Gets "game-results-last-updated" from localStorage
 * - Calls gameResultGetRoute endpoint with datetimeFrom + teamId to fetch missing game results
 * - Adds or replaces game data in Dexie if their "updated_at" is higher
 * - Returns appropriate game results for given timeframe
 */
export const useGetGameResults = (params: UseGetGameResultsParams = {}) => {
  const { datetimeFrom, datetimeTo, teamId, userId, enabled } = params;

  // Determine the scope: teamId if provided, otherwise 'user' for personal games
  const scopeId = enabled ? (teamId ?? userId) : undefined;

  return useQuery<GameResultStore[]>({
    queryKey: ['game-results', scopeId],
    queryFn:
      enabled && scopeId
        ? async () => {
            // Get last updated timestamp from localStorage for this scope
            const lastUpdatedMap = getLastUpdatedFromStorage();
            const lastUpdated = lastUpdatedMap[scopeId];
            const isRange = datetimeFrom && datetimeTo;

            // Determine the datetime to fetch from
            // If we have a lastUpdated, use it to only fetch newer records
            // Otherwise, use the provided datetimeFrom or fetch all
            const fetchFrom = isRange ? datetimeFrom : (lastUpdated ?? datetimeFrom);
            const currentUtcTime = new Date().toISOString();

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
            }

            if (!isRange) {
              setLastUpdatedInStorage(scopeId, currentUtcTime);
            }

            // Return game results from Dexie for the requested date range
            // This ensures we return all cached data, not just what was fetched
            const cachedResults = await getGameResultsByScopeAndDateRange(
              scopeId,
              datetimeFrom,
              datetimeTo,
            );

            return cachedResults;
          }
        : skipToken,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

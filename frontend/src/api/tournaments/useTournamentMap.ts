import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import {
  cachedMapData,
  getTournamentMapCache,
  mapSyncRequests,
  mergeTournamentMap,
  storeTournamentMapCache,
} from '@/dexie/tournamentMap.ts';
import type { TournamentMapRange, TournamentMapResponse } from '../../../../types/TournamentMap.ts';
import { tournamentMapKeys } from './mapQueryKeys.ts';

export function useTournamentMap(requested?: TournamentMapRange) {
  const client = useQueryClient();
  const key = tournamentMapKeys.range(requested);
  return useQuery({
    queryKey: key,
    staleTime: 60_000,
    refetchOnMount: 'always',
    retry: false,
    networkMode: 'always',
    queryFn: async ({ signal }) => {
      const fetchChanges = async (
        query: { from?: string; to?: string; updatedSince?: string } = {},
      ) => {
        const response = await api.tournament.map.$get({ query }, { init: { signal } });
        if (!response.ok) throw await createApiError(response, 'Could not refresh tournament map.');
        return (await response.json()).data;
      };
      // Retry if another tab advanced the cache or the server changed the main window.
      for (let attempt = 0; attempt < 4; attempt++) {
        const cached = await getTournamentMapCache(requested);
        const saved = cachedMapData(cached);
        if (saved && !client.getQueryData(key)) client.setQueryData(key, saved);
        const requests = cached.range ? mapSyncRequests(cached.range, cached.days) : [{}];
        const responses: TournamentMapResponse[] = [];
        for (const request of requests) {
          let response = await fetchChanges(request);
          let tournaments = mergeTournamentMap(cached.tournaments, response);
          if (!tournaments) {
            response = await fetchChanges(response.range);
            tournaments = mergeTournamentMap([], response);
          }
          if (!tournaments) throw new Error('Tournament map changed during refresh. Please retry.');
          responses.push({ ...response, tournaments });
        }
        signal.throwIfAborted();
        if (!(await storeTournamentMapCache(cached, responses))) continue;
        const result = cachedMapData(await getTournamentMapCache(requested));
        if (
          !requested &&
          cached.range &&
          result &&
          (cached.range.from !== result.window.from || cached.range.to !== result.window.to)
        )
          continue;
        if (result) return result;
      }
      throw new Error('Tournament map changed during refresh. Please retry.');
    },
  });
}

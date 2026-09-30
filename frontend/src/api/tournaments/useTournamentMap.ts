import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import {
  getTournamentMapCache,
  mergeTournamentMap,
  storeTournamentMapCache,
} from '@/dexie/tournamentMap.ts';
import type { SwuSet } from '../../../../types/enums.ts';
import { tournamentMapKeys } from './mapQueryKeys.ts';

export function useTournamentMap(set: SwuSet | undefined) {
  const client = useQueryClient();
  return useQuery({
    queryKey: tournamentMapKeys.set(set),
    staleTime: 60_000,
    refetchOnMount: 'always',
    retry: false,
    networkMode: 'always',
    queryFn: set
      ? async ({ signal }) => {
          const cached = await getTournamentMapCache(set);
          // Show saved tournaments immediately while checking for updates. A failed
          // refresh keeps this data visible and leaves the persisted cursor unchanged.
          if (cached && !client.getQueryData(tournamentMapKeys.set(set))) {
            client.setQueryData(tournamentMapKeys.set(set), cached.tournaments);
          }
          const fetchChanges = async (updatedSince?: string) => {
            const response = await api.tournament.map.$get(
              { query: { set, updatedSince } },
              { init: { signal } },
            );
            if (!response.ok)
              throw await createApiError(response, 'Could not refresh tournament map.');
            return (await response.json()).data;
          };
          let response = await fetchChanges(cached?.updatedAt ?? undefined);
          let tournaments = mergeTournamentMap(cached, response);
          if (!tournaments) {
            response = await fetchChanges();
            tournaments = mergeTournamentMap(undefined, response);
          }
          if (!tournaments) throw new Error('Tournament map changed during refresh. Please retry.');
          const saved = await storeTournamentMapCache(cached, response, tournaments);
          return saved.tournaments;
        }
      : skipToken,
  });
}

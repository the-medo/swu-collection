import { tournamentMapKeys } from './mapQueryKeys.ts';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import type { TournamentAdditionalInfo } from '../../../../types/TournamentLocation.ts';
import type { SwuSet } from '../../../../types/enums.ts';

export const tournamentLocationKeys = {
  all: ['tournament-locations'] as const,
  list: (set: SwuSet | null) => ['tournament-locations', { set }] as const,
};

export function useTournamentLocations(set: SwuSet | null, enabled: boolean) {
  return useQuery({
    queryKey: tournamentLocationKeys.list(set),
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const response = await api.tournament.bulk.coordinates.$get({
        query: { set: set ?? undefined },
      });
      if (!response.ok)
        throw await createApiError(response, 'Could not load tournament locations.');
      return (await response.json()).data;
    },
  });
}

export async function computeTournamentCoordinates(id: string, force: boolean) {
  const response = await api.tournament[':id'].coordinates.$post({
    param: { id },
    json: { force },
  });
  if (!response.ok) throw await createApiError(response, 'Could not compute coordinates.');
  return (await response.json()).data;
}

export async function invalidateTournamentLocations(client: QueryClient, id?: string) {
  await Promise.all([
    client.invalidateQueries({ queryKey: id ? ['tournament', id] : ['tournament'] }),
    ...[
      ['tournaments'],
      ['tournament-groups'],
      ['tournament-group'],
      tournamentLocationKeys.all,
      tournamentMapKeys.all,
    ].map(queryKey => client.invalidateQueries({ queryKey })),
  ]);
}

export function useSaveTournamentAdditionalInfo(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (json: {
      additionalInfo: TournamentAdditionalInfo;
      expectedAdditionalInfo: TournamentAdditionalInfo;
    }) => {
      const response = await api.tournament[':id']['additional-info'].$put({ param: { id }, json });
      if (!response.ok) throw await createApiError(response, 'Could not save additional info.');
      return (await response.json()).data;
    },
    onSuccess: () => invalidateTournamentLocations(client, id),
  });
}

export function useComputeTournamentCoordinates(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => computeTournamentCoordinates(id, true),
    onSuccess: () => invalidateTournamentLocations(client, id),
  });
}

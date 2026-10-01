import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { useRole } from '@/hooks/useRole.ts';
import { tournamentMapKeys } from './mapQueryKeys.ts';
import type { EventHighlightInput } from '../../../../types/EventHighlight.ts';

const key = ['event-highlights'] as const;
const resource = api.admin['event-highlights'];

export function useEventHighlights() {
  const isAdmin = useRole()('admin');
  return useQuery({
    queryKey: key,
    enabled: isAdmin,
    staleTime: 60_000,
    queryFn: async ({ signal }) => {
      const response = await resource.$get({}, { init: { signal } });
      if (!response.ok) throw await createApiError(response, 'Could not load highlights.');
      return (await response.json()).data;
    },
  });
}

function useRefreshHighlights() {
  const client = useQueryClient();
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: key }),
      client.invalidateQueries({ queryKey: tournamentMapKeys.all }),
    ]);
}

export function useSaveEventHighlight() {
  const refresh = useRefreshHighlights();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: EventHighlightInput }) => {
      const response = id
        ? await resource[':id'].$put({ param: { id }, json: input })
        : await resource.$post({ json: input });
      if (!response.ok) throw await createApiError(response, 'Could not save highlight.');
      return (await response.json()).data;
    },
    onSuccess: refresh,
  });
}

export function useDeleteEventHighlight() {
  const refresh = useRefreshHighlights();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await resource[':id'].$delete({ param: { id } });
      if (!response.ok) throw await createApiError(response, 'Could not delete highlight.');
    },
    onSuccess: refresh,
  });
}

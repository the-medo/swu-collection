import { useQuery } from '@tanstack/react-query';
import type { SwuSet } from '../../../../types/enums.ts';
import { createApiError } from '@/api/errors.ts';
import { api } from '@/lib/api.ts';

export function useSetChecklists(set: SwuSet) {
  return useQuery({
    queryKey: ['set-checklists', set],
    queryFn: async ({ signal }) => {
      const response = await api.set[':set'].checklists.$get(
        { param: { set } },
        { init: { signal } },
      );
      if (!response.ok) throw await createApiError(response, 'Could not load the checklists.');
      return (await response.json()).data;
    },
    staleTime: 5 * 60_000,
    refetchInterval: query => (query.state.data === null && !query.state.error ? 2_000 : false),
    retry: false,
  });
}

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { useRole } from '@/hooks/useRole.ts';
import { tournamentWeekendQueryKeys } from './queryKeys.ts';

export function useGetResourceSubmissions() {
  const isAdmin = useRole()('admin');
  return useQuery({
    queryKey: tournamentWeekendQueryKeys.submissions(),
    enabled: isAdmin,
    staleTime: 30_000,
    queryFn: async ({ signal }) => {
      const response = await api.admin['resource-submissions'].$get({}, { init: { signal } });
      if (!response.ok)
        throw await createApiError(response, 'Could not load resource submissions.');
      return (await response.json()).data;
    },
  });
}

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { useRole } from '@/hooks/useRole.ts';
import { cardGroupKeys } from './queryKeys.ts';

export function useCardGroups(admin = false) {
  const isAdmin = useRole()('admin');
  return useQuery({
    queryKey: admin ? cardGroupKeys.admin : cardGroupKeys.published,
    enabled: !admin || isAdmin,
    staleTime: 60_000,
    refetchOnMount: admin ? true : 'always',
    queryFn: async ({ signal }) => {
      const resource = admin ? api.admin['card-groups'] : api['card-groups'];
      const response = await resource.$get({}, { init: { signal } });
      if (!response.ok) throw await createApiError(response, 'Could not load card groups.');
      return (await response.json()).data;
    },
  });
}

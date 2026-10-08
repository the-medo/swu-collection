import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useUser } from '@/hooks/useUser';
import { useRole } from '@/hooks/useRole';
import { createApiError } from '@/api/errors';
import { creditKeys } from './queryKeys';

export function useCreditUsers(search: string) {
  const actor = useUser();
  const isAdmin = useRole()('admin');
  return useQuery({
    queryKey: creditKeys.users(actor?.id, search),
    enabled: !!actor && isAdmin,
    staleTime: 0,
    gcTime: 0,
    queryFn: async () => {
      const response = await api.admin.credits.$get({ query: { search } });
      if (!response.ok) throw await createApiError(response, 'Could not load user credits.');
      return (await response.json()).data;
    },
  });
}

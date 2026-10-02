import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { useUser } from '@/hooks/useUser.ts';
import { createApiError } from '@/api/errors.ts';
import { meleeConnectionKeys } from './queryKeys.ts';

export function useMeleeConnection() {
  const user = useUser();
  return useQuery({
    queryKey: meleeConnectionKeys.status(user?.id),
    enabled: !!user,
    staleTime: 0,
    gcTime: 0,
    queryFn: async () => {
      const response = await api.integration.melee.$get();
      if (!response.ok)
        throw await createApiError(response, 'Could not load your Melee connection.');
      return (await response.json()).data;
    },
  });
}

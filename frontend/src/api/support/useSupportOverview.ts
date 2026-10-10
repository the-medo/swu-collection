import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { createApiError } from '@/api/errors';
import { useUser } from '@/hooks/useUser';
import { supportKeys } from './queryKeys';

export function useSupportOverview() {
  const user = useUser();
  return useQuery({
    queryKey: supportKeys.overview(user?.id),
    staleTime: 30_000,
    queryFn: async () => {
      const response = await api.support.$get();
      if (!response.ok) throw await createApiError(response, 'Could not load support options.');
      return (await response.json()).data;
    },
  });
}

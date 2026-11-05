import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { useUser } from '@/hooks/useUser.ts';
import { createApiError } from '@/api/errors.ts';
import { integrationAppKeys } from './queryKeys.ts';

export function useIntegrationApps() {
  const user = useUser();
  return useQuery({
    queryKey: integrationAppKeys.apps(user?.id),
    enabled: !!user,
    staleTime: 0,
    gcTime: 0,
    queryFn: async () => {
      const response = await api['integration-apps'].apps.$get();
      if (!response.ok) throw await createApiError(response, 'Could not load apps.');
      return (await response.json()).data;
    },
  });
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { useUser } from '@/hooks/useUser.ts';
import { integrationAppKeys } from './queryKeys.ts';

export function useIntegrationConnections() {
  const user = useUser();
  return useQuery({
    queryKey: integrationAppKeys.connections(user?.id),
    enabled: !!user,
    staleTime: 0,
    gcTime: 0,
    queryFn: async () => {
      const response = await api['integration-apps'].connections.$get();
      if (!response.ok) throw await createApiError(response, 'Could not load connected apps.');
      return (await response.json()).data;
    },
  });
}

export function useDisconnectIntegrationApp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (clientId: string) => {
      const response = await api['integration-apps'].connections[':clientId'].$delete(
        { param: { clientId } },
        { headers: { 'X-Requested-With': 'swubase' } },
      );
      if (!response.ok) throw await createApiError(response, 'Could not disconnect app.');
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: integrationAppKeys.all });
    },
  });
}

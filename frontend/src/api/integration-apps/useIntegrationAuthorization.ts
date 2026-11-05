import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { useUser } from '@/hooks/useUser.ts';
import type { IntegrationAuthorizeInput } from '../../../../shared/types/integrationApp.ts';
import { integrationAppKeys } from './queryKeys.ts';

export function useIntegrationAuthorization(request: IntegrationAuthorizeInput, enabled = true) {
  const user = useUser();
  return useQuery({
    queryKey: integrationAppKeys.authorization(user?.id, request),
    enabled: !!user && enabled,
    staleTime: 0,
    gcTime: 0,
    retry: false,
    queryFn: async () => {
      const response = await api['integration-apps'].authorize.$get({ query: request });
      if (!response.ok) throw await createApiError(response, 'Could not load access request.');
      return (await response.json()).data;
    },
  });
}

export function useIntegrationConsent(request: IntegrationAuthorizeInput) {
  const queryClient = useQueryClient();
  return useMutation({
    gcTime: 0,
    mutationFn: async (accept: boolean) => {
      const response = await api['integration-apps'].authorize.$post(
        { json: { ...request, accept } },
        { headers: { 'X-Requested-With': 'swubase' } },
      );
      if (!response.ok) throw await createApiError(response, 'Could not complete authorization.');
      return (await response.json()).data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: integrationAppKeys.all });
    },
  });
}

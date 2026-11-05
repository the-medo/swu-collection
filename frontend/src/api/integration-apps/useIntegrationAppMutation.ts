import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { useUser } from '@/hooks/useUser.ts';
import type { IntegrationAppInput } from '../../../../shared/types/integrationApp.ts';
import { integrationAppKeys } from './queryKeys.ts';

type Action =
  | { action: 'create'; input: IntegrationAppInput }
  | { action: 'update'; clientId: string; input: IntegrationAppInput }
  | { action: 'status'; clientId: string; disabled: boolean }
  | { action: 'rotate' | 'delete'; clientId: string };

export function useIntegrationAppMutation() {
  const user = useUser();
  const queryClient = useQueryClient();
  return useMutation({
    gcTime: 0,
    mutationFn: async (input: Action) => {
      if (!user) throw new Error('Sign in to manage apps.');
      if (input.action === 'create' || input.action === 'rotate') {
        const response =
          input.action === 'create'
            ? await api['integration-apps'].apps.$post(
                { json: input.input },
                { headers: { 'X-Requested-With': 'swubase' } },
              )
            : await api['integration-apps'].apps[':clientId']['rotate-secret'].$post(
                { param: { clientId: input.clientId } },
                { headers: { 'X-Requested-With': 'swubase' } },
              );
        if (!response.ok)
          throw await createApiError(response, 'Could not generate app credentials.');
        return (await response.json()).data;
      }
      const param = { clientId: input.clientId };
      const options = { headers: { 'X-Requested-With': 'swubase' } };
      const response =
        input.action === 'update'
          ? await api['integration-apps'].apps[':clientId'].$put(
              { param, json: input.input },
              options,
            )
          : input.action === 'status'
            ? await api['integration-apps'].apps[':clientId'].status.$put(
                { param, json: { disabled: input.disabled } },
                options,
              )
            : await api['integration-apps'].apps[':clientId'].$delete({ param }, options);
      if (!response.ok) throw await createApiError(response, 'Could not update app.');
      return null;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: integrationAppKeys.all });
    },
  });
}

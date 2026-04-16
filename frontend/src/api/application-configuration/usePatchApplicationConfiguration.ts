import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createApiError } from '@/api/errors.ts';
import { api } from '@/lib/api.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';
import type { ApplicationConfiguration } from '../../../../shared/lib/application-configuration/applicationConfiguration.ts';
import { applicationConfigurationQueryKey } from './useGetApplicationConfiguration';

export type ApplicationConfigurationPatch = {
  [K in keyof ApplicationConfiguration]: Pick<ApplicationConfiguration, K> &
    Partial<Record<Exclude<keyof ApplicationConfiguration, K>, never>>;
}[keyof ApplicationConfiguration];

export const usePatchApplicationConfiguration = () => {
  const queryClient = useQueryClient();

  return useMutation<ApplicationConfiguration, ErrorWithStatus, ApplicationConfigurationPatch>({
    mutationFn: async data => {
      const response = await api['application-configuration'].$patch({
        json: data,
      });

      if (!response.ok) {
        throw await createApiError(response, 'Failed to update application configuration');
      }

      return response.json() as Promise<ApplicationConfiguration>;
    },
    onSuccess: data => {
      queryClient.setQueryData(applicationConfigurationQueryKey, data);
    },
  });
};

import { useQuery } from '@tanstack/react-query';
import { createApiError } from '@/api/errors.ts';
import { api } from '@/lib/api.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';
import type { ApplicationConfiguration } from '../../../../shared/lib/application-configuration/applicationConfiguration.ts';

export const applicationConfigurationQueryKey = ['application-configuration'] as const;

export const useGetApplicationConfiguration = () => {
  return useQuery<ApplicationConfiguration, ErrorWithStatus>({
    queryKey: applicationConfigurationQueryKey,
    queryFn: async () => {
      const response = await api['application-configuration'].$get();

      if (!response.ok) {
        throw await createApiError(response, 'Failed to fetch application configuration');
      }

      return response.json() as Promise<ApplicationConfiguration>;
    },
    staleTime: Infinity,
  });
};

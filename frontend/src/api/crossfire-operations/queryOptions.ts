import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';
import type { CrossfireOperationsHours } from '../../../../shared/types/crossfire-operations.ts';

function isAuthError(error: ErrorWithStatus | null) {
  return error?.status === 401 || error?.status === 403;
}

export function crossfireOperationsQueryOptions(
  sessionId: string | undefined,
  hours: CrossfireOperationsHours,
) {
  return queryOptions({
    queryKey: ['crossfire-operations', sessionId, hours],
    queryFn: async ({ signal }) => {
      const response = await api.admin['crossfire-operations'].$get(
        { query: { hours: String(hours) as `${CrossfireOperationsHours}` } },
        { init: { signal } },
      );
      if (!response.ok) throw await createApiError(response, 'Could not load Crossfire operations');
      return (await response.json()).data;
    },
    placeholderData: keepPreviousData,
    staleTime: 5_000,
    retry: (failureCount, error) => !isAuthError(error) && failureCount < 3,
    refetchInterval: query => (isAuthError(query.state.error) ? false : 10_000),
  });
}

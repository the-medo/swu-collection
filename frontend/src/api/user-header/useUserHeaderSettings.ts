import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { userHeaderKeys } from './queryKeys.ts';

export function useUserHeaderSettings(userId: string | undefined) {
  return useQuery({
    queryKey: userHeaderKeys.settings(userId),
    staleTime: 0,
    gcTime: 0,
    queryFn: userId
      ? async ({ signal }) => {
          const response = await api.user.header.$get({}, { init: { signal } });
          if (!response.ok)
            throw await createApiError(response, 'Could not load your header settings.');
          return (await response.json()).data;
        }
      : skipToken,
  });
}

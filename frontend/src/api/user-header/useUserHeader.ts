import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { userHeaderKeys } from './queryKeys.ts';

export function useUserHeader(userId: string | undefined) {
  return useQuery({
    queryKey: userHeaderKeys.view(userId),
    staleTime: 0,
    queryFn: userId
      ? async ({ signal }) => {
          const response = await api.user[':id'].header.$get(
            { param: { id: userId } },
            { init: { signal } },
          );
          if (!response.ok)
            throw await createApiError(response, 'Could not load the profile header.');
          return (await response.json()).data;
        }
      : skipToken,
  });
}

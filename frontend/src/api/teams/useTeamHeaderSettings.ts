import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { teamHeaderKeys } from './headerQueryKeys.ts';

export function useTeamHeaderSettings(teamId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: teamHeaderKeys.settings(teamId, userId),
    staleTime: 0,
    gcTime: 0,
    queryFn:
      teamId && userId
        ? async ({ signal }) => {
            const response = await api.teams[':id'].header.settings.$get(
              { param: { id: teamId } },
              { init: { signal } },
            );
            if (!response.ok)
              throw await createApiError(response, 'Could not load team header settings.');
            return (await response.json()).data;
          }
        : skipToken,
  });
}

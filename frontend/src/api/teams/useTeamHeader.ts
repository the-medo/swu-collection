import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { teamHeaderKeys } from './headerQueryKeys.ts';

export function useTeamHeader(teamId: string | undefined) {
  return useQuery({
    queryKey: teamHeaderKeys.view(teamId),
    staleTime: 60_000,
    queryFn: teamId
      ? async ({ signal }) => {
          const response = await api.teams[':id'].header.$get(
            { param: { id: teamId } },
            { init: { signal } },
          );
          if (!response.ok) throw await createApiError(response, 'Could not load the team header.');
          return (await response.json()).data;
        }
      : skipToken,
  });
}

import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { useUser } from '@/hooks/useUser.ts';
import { createApiError } from '@/api/errors.ts';
import { teamBookmarkQueryKeys } from './bookmarkQueryKeys.ts';

export function useTeamBookmarks(teamId: string) {
  const user = useUser();
  return useQuery({
    queryKey: teamBookmarkQueryKeys.list(teamId, user?.id),
    queryFn: user
      ? async () => {
          const response = await api.teams[':id'].bookmarks.$get({ param: { id: teamId } });
          if (!response.ok) throw await createApiError(response, 'Unable to load team bookmarks');
          return (await response.json()).data;
        }
      : skipToken,
    staleTime: 30_000,
  });
}

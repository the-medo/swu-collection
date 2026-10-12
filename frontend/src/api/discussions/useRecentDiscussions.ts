import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { discussionKeys } from './queryKeys.ts';

export function useRecentDiscussions() {
  return useQuery({
    queryKey: discussionKeys.recent,
    queryFn: async ({ signal }) => {
      const response = await api.discussions.recent.$get({}, { init: { signal } });
      if (!response.ok) throw await createApiError(response, 'Could not load recent discussions.');
      return (await response.json()).data;
    },
    staleTime: 60_000,
    refetchOnMount: 'always',
    retry: 1,
  });
}

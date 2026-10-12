import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { discussionKeys } from './queryKeys.ts';
import type { DiscussionFeedKind, DiscussionType } from '../../../../shared/types/discussions.ts';

export function useDiscussionFeed(kind: DiscussionFeedKind, type?: DiscussionType) {
  return useInfiniteQuery({
    queryKey: discussionKeys.feed(kind, type),
    queryFn: async ({ pageParam, signal }) => {
      const response = await api.discussions.feed.$get(
        { query: { kind, type, limit: '20', cursor: pageParam } },
        { init: { signal } },
      );
      if (!response.ok) throw await createApiError(response, `Could not load ${kind}.`);
      return response.json();
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: page => page.nextCursor ?? undefined,
    staleTime: 60_000,
    refetchOnMount: 'always',
    retry: 1,
  });
}

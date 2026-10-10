import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { useSession } from '@/lib/auth-client.ts';
import { createApiError } from '@/api/errors.ts';
import { discussionKeys } from './queryKeys.ts';
import type { CommentsPage, DiscussionTarget } from '../../../../shared/types/discussions.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';

export function useOwnDiscussionComments(target: DiscussionTarget) {
  const session = useSession();
  const viewerId = session.data?.user.id;
  return useInfiniteQuery<CommentsPage, ErrorWithStatus>({
    queryKey: discussionKeys.ownComments(target, viewerId),
    enabled: !!viewerId && !session.isPending,
    queryFn: async ({ pageParam }) => {
      const response = await api.discussions['own-comments'].$get({
        query: {
          ...target,
          cursor: typeof pageParam === 'string' ? pageParam : undefined,
          limit: '20',
        },
      });
      if (!response.ok) throw await createApiError(response, 'Could not load your comments.');
      return response.json();
    },
    initialPageParam: undefined,
    getNextPageParam: page => page.nextCursor ?? undefined,
    staleTime: Infinity,
    retry: (count, error) => error.status !== 401 && count < 2,
  });
}

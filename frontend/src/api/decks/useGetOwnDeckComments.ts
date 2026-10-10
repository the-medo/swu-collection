import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { useSession } from '@/lib/auth-client.ts';
import { createApiError } from '@/api/errors.ts';
import { deckDiscussionKeys } from './discussionKeys.ts';
import type { DeckCommentsPage } from '../../../../shared/types/deck-discussion.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';

export function useGetOwnDeckComments(deckId: string) {
  const session = useSession();
  const viewerId = session.data?.user.id;
  return useInfiniteQuery<DeckCommentsPage, ErrorWithStatus>({
    queryKey: deckDiscussionKeys.ownComments(deckId, viewerId),
    enabled: !!deckId && !!viewerId && !session.isPending,
    queryFn: async ({ pageParam }) => {
      const response = await api.deck[':id'].comments.own.$get({
        param: { id: deckId },
        query: { cursor: typeof pageParam === 'string' ? pageParam : undefined, limit: '20' },
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

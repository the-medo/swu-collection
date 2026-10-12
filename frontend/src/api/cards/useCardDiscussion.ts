import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { useSession } from '@/lib/auth-client.ts';
import { createApiError } from '@/api/errors.ts';
import { discussionKeys } from '@/api/discussions/queryKeys.ts';
import type { PostDocument } from '../../../../shared/posts/content.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';

export const cardDiscussionKeys = {
  all: ['card-discussion'] as const,
  binding: (cardId: string) => ['card-discussion', cardId] as const,
};

export function useCardDiscussion(cardId: string) {
  const client = useQueryClient();
  const session = useSession();
  const viewer = session.data?.user.id;
  return useQuery<string | null, ErrorWithStatus>({
    queryKey: cardDiscussionKeys.binding(cardId),
    enabled: !!cardId && !session.isPending,
    queryFn: async ({ signal }) => {
      const response = await api.cards[':id'].discussion.$get(
        { param: { id: cardId } },
        { init: { signal } },
      );
      if (!response.ok) throw await createApiError(response, 'Could not load this discussion.');
      const info = (await response.json()).data;
      if (info && !signal.aborted) client.setQueryData(discussionKeys.info(info.id, viewer), info);
      return info?.id ?? null;
    },
    // Recheck empty cards on return: another reader may have started a discussion.
    staleTime: query => (query.state.data ? Infinity : 0),
    retry: (count, error) => error.status !== 404 && count < 2,
  });
}

export function useCreateCardComment(cardId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (content: PostDocument) => {
      const response = await api.cards[':id'].discussion.comments.$post({
        param: { id: cardId },
        json: { content },
      });
      if (!response.ok) throw await createApiError(response, 'Could not post this comment.');
      return (await response.json()).data;
    },
    onSuccess: async comment => {
      void client.invalidateQueries({ queryKey: discussionKeys.recent });
      await client.cancelQueries({ queryKey: cardDiscussionKeys.binding(cardId) });
      client.setQueryData(cardDiscussionKeys.binding(cardId), comment.discussionId);
      void client.invalidateQueries({ queryKey: discussionKeys.discussion(comment.discussionId) });
      void client.invalidateQueries({ queryKey: discussionKeys.ownCommentsAll });
    },
  });
}

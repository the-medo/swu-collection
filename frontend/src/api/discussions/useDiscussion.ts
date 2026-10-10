import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { useSession } from '@/lib/auth-client.ts';
import { createApiError } from '@/api/errors.ts';
import { discussionKeys } from './queryKeys.ts';
import { cacheIncludedReplies } from './cache.ts';
import type {
  CommentsPage,
  DiscussionComment,
  DiscussionInfo,
  DiscussionThread,
} from '../../../../shared/types/discussions.ts';
import type { PostDocument } from '../../../../shared/posts/content.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';

export function useDiscussion(id: string, enabled = true) {
  const session = useSession();
  return useQuery<DiscussionInfo, ErrorWithStatus>({
    queryKey: discussionKeys.info(id, session.data?.user.id),
    enabled: enabled && !!id && !session.isPending,
    queryFn: async ({ signal }) => {
      const response = await api.discussions[':id'].$get({ param: { id } }, { init: { signal } });
      if (!response.ok) throw await createApiError(response, 'Could not load this discussion.');
      return (await response.json()).data;
    },
    staleTime: Infinity,
    retry: (count, error) => error.status !== 404 && error.status !== 403 && count < 2,
  });
}
export function useDiscussionComments(
  id: string,
  parentId?: string,
  enabled = true,
  includedReplies?: DiscussionComment[],
) {
  const session = useSession();
  const client = useQueryClient();
  const viewer = session.data?.user.id;
  return useInfiniteQuery<CommentsPage, ErrorWithStatus>({
    queryKey: discussionKeys.comments(id, viewer, parentId),
    enabled: !!id && !session.isPending && enabled,
    // A collapsed thread can outlive its descendants' caches. Restore the complete
    // embedded list on remount without issuing a request for a single reply.
    // A display fallback lets access resets clear the real cache.
    placeholderData:
      parentId && includedReplies
        ? {
            pages: [
              {
                data: includedReplies,
                total:
                  client.getQueryData<DiscussionInfo>(discussionKeys.info(id, viewer))?.total ?? 0,
                nextCursor: null,
              },
            ],
            pageParams: [undefined],
          } satisfies InfiniteData<CommentsPage>
        : undefined,
    queryFn: async context => {
      const { pageParam } = context;
      const response = await api.discussions[':id'].comments.$get(
        {
          param: { id },
          query: {
            parentId,
            limit: '20',
            cursor: typeof pageParam === 'string' ? pageParam : undefined,
          },
        },
        // Keep the root request shared across the development mount cycle.
        // Explicitly cancelled roots are checked before filling reply caches.
        parentId ? { init: { signal: context.signal } } : undefined,
      );
      if (!response.ok) throw await createApiError(response, 'Could not load comments.');
      const page = await response.json();
      if (!context.signal.aborted)
        await cacheIncludedReplies(client, id, viewer, page, context.signal);
      return page;
    },
    initialPageParam: undefined,
    getNextPageParam: page => page.nextCursor ?? undefined,
    staleTime: Infinity,
    retry: (count, error) => error.status !== 404 && error.status !== 403 && count < 2,
  });
}
export function useDiscussionThread(id: string, commentId?: string) {
  const session = useSession();
  return useQuery<DiscussionThread, ErrorWithStatus>({
    queryKey: discussionKeys.thread(id, session.data?.user.id, commentId),
    enabled: !!id && !!commentId && !session.isPending,
    queryFn: async ({ signal }) => {
      const response = await api.discussions[':id'].comments[':commentId'].thread.$get(
        {
          param: { id, commentId: commentId! },
        },
        { init: { signal } },
      );
      if (!response.ok) throw await createApiError(response, 'Could not open this comment.');
      return (await response.json()).data;
    },
    staleTime: Infinity,
    retry: (count, error) =>
      error.status !== 404 && error.status !== 403 && error.status !== 410 && count < 2,
  });
}
export async function getDiscussionComment(id: string, commentId: string) {
  const response = await api.discussions[':id'].comments[':commentId'].$get({
    param: { id, commentId },
  });
  if (!response.ok) throw await createApiError(response, 'Could not load this comment.');
  return (await response.json()).data;
}
export function useDiscussionCommentMutation(id: string, onChanged?: () => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (
      input:
        | { action: 'create'; content: PostDocument; parentId?: string | null }
        | { action: 'edit'; commentId: string; content: PostDocument; revision: number }
        | { action: 'delete'; commentId: string },
    ) => {
      const response =
        input.action === 'create'
          ? await api.discussions[':id'].comments.$post({
              param: { id },
              json: { content: input.content, parentId: input.parentId },
            })
          : input.action === 'edit'
            ? await api.discussions[':id'].comments[':commentId'].$put({
                param: { id, commentId: input.commentId },
                json: { content: input.content, revision: input.revision },
              })
            : await api.discussions[':id'].comments[':commentId'].$delete({
                param: { id, commentId: input.commentId },
              });
      if (!response.ok) throw await createApiError(response, 'Could not save this comment.');
      return response.json();
    },
    onSettled: () => {
      void client.invalidateQueries({ queryKey: discussionKeys.discussion(id) });
      onChanged?.();
    },
  });
}

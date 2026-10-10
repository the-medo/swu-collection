import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import type { CommentsPage } from '../../../../shared/types/discussions.ts';
import { discussionKeys } from './queryKeys.ts';

export async function cacheIncludedReplies(
  client: QueryClient,
  discussionId: string,
  viewer: string | undefined,
  page: CommentsPage,
  signal?: AbortSignal,
) {
  const visit = async (comments: CommentsPage['data']) => {
    for (const comment of comments) {
      if (signal?.aborted) return;
      if (!comment.replies) continue;
      const queryKey = discussionKeys.comments(discussionId, viewer, comment.id);
      // A complete embedded list supersedes older in-flight or paginated replies.
      await client.cancelQueries({ queryKey, exact: true }, { silent: true });
      if (signal?.aborted) return;
      client.setQueryData<InfiniteData<CommentsPage>>(queryKey, {
        pages: [{ data: comment.replies, total: page.total, nextCursor: null }],
        pageParams: [undefined],
      });
      await visit(comment.replies);
    }
  };
  await visit(page.data);
}

import { expect, test } from 'bun:test';
import { QueryClient, type InfiniteData } from '@tanstack/react-query';
import { emptyPostDocument } from '../../../../shared/posts/content.ts';
import type { CommentsPage, DiscussionComment } from '../../../../shared/types/discussions.ts';
import { cacheIncludedReplies } from './cache.ts';
import { discussionKeys } from './queryKeys.ts';

const comment = (id: string, parentId: string | null, replyCount: number): DiscussionComment => ({
  id,
  parentId,
  replyCount,
  discussionId: 'discussion',
  depth: 0,
  authorId: 'author',
  content: emptyPostDocument(),
  revision: 1,
  deletedAt: null,
  createdAt: '2026-10-10T00:00:00Z',
  updatedAt: '2026-10-10T00:00:00Z',
  author: { id: 'author', displayName: 'Author', image: null },
});
const page = (data: DiscussionComment[]): CommentsPage => ({ data, total: 12, nextCursor: null });

test('embedded replies populate complete viewer-scoped caches, including deleted ancestor chains', async () => {
  const client = new QueryClient();
  const child = { ...comment('child', 'deleted', 0), replies: [] };
  const deleted = {
    ...comment('deleted', 'parent', 1),
    deletedAt: '2026-10-10T00:00:00Z',
    replies: [child],
  };
  const parent = { ...comment('parent', null, 1), replies: [deleted] };
  const otherViewer = discussionKeys.comments('discussion', 'other', 'parent');
  client.setQueryData(otherViewer, { private: 'different viewer' });
  try {
    await cacheIncludedReplies(client, 'discussion', 'reader', page([parent]));
    const data = (id: string) =>
      client.getQueryData<InfiniteData<CommentsPage>>(
        discussionKeys.comments('discussion', 'reader', id),
      );
    expect(data('parent')).toEqual({ pages: [page([deleted])], pageParams: [undefined] });
    expect(data('deleted')?.pages[0].data).toEqual([child]);
    expect(data('child')?.pages[0].data).toEqual([]);
    expect(data('parent')?.pages[0].nextCursor).toBeNull();
    expect(client.getQueryData(otherViewer)).toEqual({ private: 'different viewer' });
  } finally {
    client.clear();
  }
});

test('unexpanded multi-reply threads retain their loaded pages', async () => {
  const client = new QueryClient();
  const key = discussionKeys.comments('discussion', 'reader', 'parent');
  const existing = {
    pages: [page([comment('a', 'parent', 0)]), page([comment('b', 'parent', 0)])],
    pageParams: [undefined, 'cursor'],
  };
  client.setQueryData(key, existing);
  try {
    await cacheIncludedReplies(client, 'discussion', 'reader', page([comment('parent', null, 2)]));
    expect(client.getQueryData(key)).toEqual(existing);
  } finally {
    client.clear();
  }
});

test('a late reply response cannot overwrite a complete embedded list', async () => {
  const client = new QueryClient();
  const key = discussionKeys.comments('discussion', 'reader', 'parent');
  let finish!: (value: CommentsPage) => void;
  const pending = new Promise<CommentsPage>(resolve => {
    finish = resolve;
  });
  const request = client
    .fetchInfiniteQuery({
      queryKey: key,
      initialPageParam: undefined,
      queryFn: () => pending,
      getNextPageParam: () => undefined,
    })
    .catch(() => undefined);
  try {
    expect(client.getQueryState(key)?.fetchStatus).toBe('fetching');
    const child = { ...comment('current', 'parent', 0), replies: [] };
    await cacheIncludedReplies(
      client,
      'discussion',
      'reader',
      page([{ ...comment('parent', null, 1), replies: [child] }]),
    );
    finish(page([comment('outdated', 'parent', 0)]));
    await request;
    expect(client.getQueryData<InfiniteData<CommentsPage>>(key)?.pages[0].data).toEqual([child]);
  } finally {
    client.clear();
  }
});

test('a cancelled comments response cannot repopulate its reply caches', async () => {
  const client = new QueryClient();
  const controller = new AbortController();
  controller.abort();
  try {
    await cacheIncludedReplies(
      client,
      'discussion',
      'reader',
      page([{ ...comment('parent', null, 1), replies: [comment('child', 'parent', 0)] }]),
      controller.signal,
    );
    expect(
      client.getQueryData(discussionKeys.comments('discussion', 'reader', 'parent')),
    ).toBeUndefined();
    expect(client.getQueryCache().getAll()).toHaveLength(0);
  } finally {
    client.clear();
  }
});

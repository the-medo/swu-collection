export const discussionKeys = {
  all: ['discussions'] as const,
  discussion: (id: string) => ['discussions', id] as const,
  thread: (id: string, viewer: string | undefined, commentId: string | undefined) =>
    ['discussions', id, 'thread', viewer ?? 'anonymous', commentId] as const,
  info: (id: string, viewer?: string) =>
    ['discussions', id, 'info', viewer ?? 'anonymous'] as const,
  comments: (id: string, viewer?: string, parentId?: string) =>
    ['discussions', id, 'comments', viewer ?? 'anonymous', parentId ?? 'root'] as const,
};

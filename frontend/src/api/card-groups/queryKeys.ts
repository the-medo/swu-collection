export const cardGroupKeys = {
  all: ['card-groups'] as const,
  published: ['card-groups', 'published'] as const,
  feed: ['card-groups', 'feed', 'position'] as const,
  admin: ['card-groups', 'admin'] as const,
  detail: (id: string) => ['card-groups', 'detail', id] as const,
};

export const dailyPoolDiscussionKeys = {
  discussion: (poolId: string, viewer?: string) =>
    ['daily-pool-discussion', poolId, 'discussion', viewer ?? 'anonymous'] as const,
  binding: (poolId: string, viewer?: string) =>
    ['daily-pool-discussion', poolId, 'binding', viewer ?? 'anonymous'] as const,
};

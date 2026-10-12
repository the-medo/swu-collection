export const dailySealedKeys = {
  all: ['daily-sealed-pool'] as const,
  byDate: (date?: string) => [...dailySealedKeys.all, date ?? 'today'] as const,
  myBuild: (poolId: string, userId?: string) =>
    [...dailySealedKeys.all, 'my-build', poolId, userId ?? 'anonymous'] as const,
};

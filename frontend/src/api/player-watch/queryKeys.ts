export const playerWatchQueryKeys = {
  all: ['player-watch'] as const,
  list: () => [...playerWatchQueryKeys.all, 'list'] as const,
};

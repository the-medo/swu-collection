export const playerWatchQueryKeys = {
  all: ['player-watch'] as const,
  list: () => [...playerWatchQueryKeys.all, 'list'] as const,
  players: (search: string) => [...playerWatchQueryKeys.all, 'players', search] as const,
};

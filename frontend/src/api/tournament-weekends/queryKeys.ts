export const tournamentWeekendQueryKeys = {
  all: ['tournament-weekends'] as const,
  submissions: () => [...tournamentWeekendQueryKeys.all, 'resource-submissions'] as const,
  list: () => [...tournamentWeekendQueryKeys.all, 'list'] as const,
  live: () => [...tournamentWeekendQueryKeys.all, 'live'] as const,
  watchedPlayerRounds: (weekendId: string, userId: string) =>
    [...tournamentWeekendQueryKeys.all, 'watched-player-rounds', weekendId, userId] as const,
  watchedTournamentRounds: (weekendId: string, userId: string, tournamentId: string) =>
    [...tournamentWeekendQueryKeys.watchedPlayerRounds(weekendId, userId), tournamentId] as const,
  watchedPlayerRoundHistory: (
    weekendId: string,
    userId: string,
    tournamentId: string,
    displayName: string,
  ) =>
    [
      ...tournamentWeekendQueryKeys.watchedTournamentRounds(weekendId, userId, tournamentId),
      displayName,
    ] as const,
  detail: (id?: string) => [...tournamentWeekendQueryKeys.all, 'detail', id] as const,
  liveBracket: (id?: string, tournamentId?: string) =>
    [...tournamentWeekendQueryKeys.all, 'live-bracket', id, tournamentId] as const,
  resourceList: (id?: string) => [...tournamentWeekendQueryKeys.all, 'resources', id] as const,
  resources: (id?: string, status: string = 'all') =>
    [...tournamentWeekendQueryKeys.resourceList(id), status] as const,
};

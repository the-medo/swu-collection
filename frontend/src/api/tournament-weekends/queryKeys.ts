export const tournamentWeekendQueryKeys = {
  all: ['tournament-weekends'] as const,
  list: () => [...tournamentWeekendQueryKeys.all, 'list'] as const,
  live: () => [...tournamentWeekendQueryKeys.all, 'live'] as const,
  detail: (id?: string) => [...tournamentWeekendQueryKeys.all, 'detail', id] as const,
  liveBracket: (id?: string, tournamentId?: string) =>
    [...tournamentWeekendQueryKeys.all, 'live-bracket', id, tournamentId] as const,
  resourceList: (id?: string) => [...tournamentWeekendQueryKeys.all, 'resources', id] as const,
  resources: (id?: string, status: string = 'all') =>
    [...tournamentWeekendQueryKeys.resourceList(id), status] as const,
};

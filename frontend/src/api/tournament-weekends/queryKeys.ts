export const tournamentWeekendQueryKeys = {
  all: ['tournament-weekends'] as const,
  list: () => [...tournamentWeekendQueryKeys.all, 'list'] as const,
  live: () => [...tournamentWeekendQueryKeys.all, 'live'] as const,
  detail: (id?: string) => [...tournamentWeekendQueryKeys.all, 'detail', id] as const,
};

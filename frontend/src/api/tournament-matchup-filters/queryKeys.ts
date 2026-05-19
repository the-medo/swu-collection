export const tournamentMatchupFilterQueryKeys = {
  all: ['tournament-matchup-filters'] as const,
  lists: () => [...tournamentMatchupFilterQueryKeys.all, 'list'] as const,
  list: (formatId: number | undefined) =>
    [...tournamentMatchupFilterQueryKeys.lists(), formatId] as const,
};

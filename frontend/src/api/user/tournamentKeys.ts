export const userTournamentKeys = {
  all: ['user-tournaments'] as const,
  profile: (userId: string) => ['user-tournaments', userId] as const,
  report: (userId: string, tournamentId?: string) =>
    ['user-tournaments', userId, 'report', tournamentId] as const,
};

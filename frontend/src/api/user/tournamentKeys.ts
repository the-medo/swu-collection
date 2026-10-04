export const userTournamentKeys = {
  all: ['user-tournaments'] as const,
  profile: (userId: string) => ['user-tournaments', userId] as const,
};

export const teamHeaderKeys = {
  all: (teamId: string | undefined) => ['team-header', teamId] as const,
  view: (teamId: string | undefined) => ['team-header', teamId, 'view'] as const,
  settings: (teamId: string | undefined, userId: string | undefined) =>
    ['team-header', teamId, 'settings', userId] as const,
};

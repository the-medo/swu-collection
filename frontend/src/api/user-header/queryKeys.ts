export const userHeaderKeys = {
  all: (userId: string | undefined) => ['user-header', userId] as const,
  view: (userId: string | undefined) => ['user-header', userId, 'view'] as const,
  settings: (userId: string | undefined) => ['user-header', userId, 'settings'] as const,
};

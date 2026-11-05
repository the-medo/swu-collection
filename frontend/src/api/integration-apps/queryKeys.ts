export const integrationAppKeys = {
  all: ['integration-apps'] as const,
  apps: (userId?: string) => ['integration-apps', 'owned', userId] as const,
  connections: (userId?: string) => ['integration-apps', 'connections', userId] as const,
  authorization: (userId: string | undefined, request: unknown) =>
    ['integration-apps', 'authorization', userId, request] as const,
};

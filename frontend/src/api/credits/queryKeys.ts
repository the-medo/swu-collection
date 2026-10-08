export const creditKeys = {
  all: ['credits'] as const,
  users: (actorId: string | undefined, search: string) => ['credits', actorId, search] as const,
};

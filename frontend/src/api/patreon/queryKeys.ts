export const patreonKeys = {
  all: ['patreon'] as const,
  overview: (actor: string | undefined, page: number) => ['patreon', actor, page] as const,
};

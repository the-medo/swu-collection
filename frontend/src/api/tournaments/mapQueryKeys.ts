import type { SwuSet } from '../../../../types/enums.ts';

export const tournamentMapKeys = {
  all: ['tournament-map'] as const,
  set: (set: SwuSet | undefined) => ['tournament-map', { set }] as const,
};

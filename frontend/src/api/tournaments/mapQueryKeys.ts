import type { TournamentMapRange } from '../../../../types/TournamentMap.ts';

export const tournamentMapKeys = {
  all: ['tournament-map'] as const,
  range: (range?: TournamentMapRange) => ['tournament-map', range ?? 'main'] as const,
};

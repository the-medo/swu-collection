import { ProcessedTournamentGroup } from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/hooks/useProcessedTournamentGroups.ts';
import type { TournamentGroupLeaderBase } from '../../../../../../../../server/db/schema/tournament_group_leader_base.ts';
import { PQTop } from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/pqLib.ts';

const basicAxisDefinition = {
  tickSize: 5,
  tickPadding: 5,
  tickRotation: 0,
  legend: 'Week',
  legendPosition: 'middle',
  style: {
    ticks: {
      text: { fill: 'hsl(var(--muted-foreground))' },
    },
    legend: {
      text: { fill: 'hsl(var(--muted-foreground))' },
    },
  },
} as const;

export const topAxisDefinition = { ...basicAxisDefinition, legendOffset: -36 } as const;
export const bottomAxisDefinition = { ...basicAxisDefinition, legendOffset: 32 } as const;

export type SortedWeeks = string[];
export type WeekMap = Record<string, ProcessedTournamentGroup | undefined>;
export type MetaPartObject = Pick<TournamentGroupLeaderBase, 'winner' | 'top8' | 'total'>;
export type MetaShareSnapshot = Record<string, Record<string, MetaPartObject>>;

export const emptyMetaPartObject = {
  winner: 0,
  top8: 0,
  total: 0,
};

export const addToMetaPartObject = (obj: MetaPartObject, objToAdd: MetaPartObject) => {
  obj.winner += objToAdd.winner;
  obj.top8 += objToAdd.top8;
  obj.total += objToAdd.total;
};

export const getMetaPartObjectValue = (obj: MetaPartObject | undefined, top: PQTop) => {
  if (top === 'champions') return obj?.winner ?? 0;
  if (top === 'top8') return obj?.top8 ?? 0;
  return obj?.total ?? 0;
};

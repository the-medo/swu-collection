import type {
  CardDataWithVariants,
  CardListVariants,
} from '../../../../../../lib/swu-resources/types.ts';
import type { SwuSet } from '../../../../../../types/enums.ts';

export const leaderCostFilterValues = ['4', '5', '6', '7+'] as const;

export type LeaderCostFilter = (typeof leaderCostFilterValues)[number];

type FilterableLeader = Pick<
  CardDataWithVariants<CardListVariants>,
  'cost' | 'name' | 'set' | 'traits'
>;

type SetFilterMap = Partial<Record<SwuSet, true | undefined>>;

export const matchesLeaderSetFilter = (
  leader: FilterableLeader | undefined,
  setFilter: SwuSet | undefined,
): boolean => !setFilter || leader?.set === setFilter;

export const matchesLeaderCostFilter = (
  leader: FilterableLeader | undefined,
  costFilter: LeaderCostFilter | undefined,
): boolean => {
  if (!costFilter) return true;
  if (leader?.cost == null) return false;

  return costFilter === '7+' ? leader.cost >= 7 : leader.cost === Number(costFilter);
};

export const matchesLeaderSearch = (
  leader: FilterableLeader | undefined,
  search: string,
): boolean => {
  const normalizedSearch = search.trim().toLowerCase();
  if (!normalizedSearch) return true;

  return [leader?.name, ...(leader?.traits ?? [])].some(value =>
    value?.toLowerCase().includes(normalizedSearch),
  );
};

export const isLeaderSetAvailableForFormat = (
  set: SwuSet,
  setMap: SetFilterMap | undefined,
): boolean => !setMap || Boolean(setMap[set]);

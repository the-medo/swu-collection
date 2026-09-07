import type {
  CardDataWithVariants,
  CardListVariants,
} from '../../../../../../lib/swu-resources/types.ts';
import type { SwuSet } from '../../../../../../types/enums.ts';

export const leaderCostFilterValues = ['4', '5', '6', '7+'] as const;

export type LeaderCostFilter = (typeof leaderCostFilterValues)[number];

type FilterableLeader = Pick<CardDataWithVariants<CardListVariants>, 'cost' | 'set'>;

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

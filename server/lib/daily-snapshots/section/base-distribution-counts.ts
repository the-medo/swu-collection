import type {
  CardDataWithVariants,
  CardList,
  CardListVariants,
} from '../../../../lib/swu-resources/types.ts';
import {
  baseSpecialNames,
  getHomeworldBaseTrait,
  isForceBase,
} from '../../../../shared/lib/basicBases.ts';
import {
  baseDistributionCategories,
  type BaseDistributionCategory,
  type BaseDistributionCounts,
  type BaseDistributionSplit,
} from '../../../../types/DailySnapshots.ts';
import { SwuAspect } from '../../../../types/enums.ts';

const planetCategories = {
  Endor: 'endor',
  Tatooine: 'tatooine',
  Kashyyyk: 'kashyyyk',
  Naboo: 'naboo',
} as const;

export function getBaseDistributionCategories(
  base: CardDataWithVariants<CardListVariants>,
): BaseDistributionCategory[] {
  const categories = new Set<BaseDistributionCategory>();
  if (isForceBase(base.cardId)) categories.add('force');
  if (baseSpecialNames[base.cardId]?.endsWith('-AspectIgnore')) categories.add('splash');

  const planet = getHomeworldBaseTrait(base.cardId);
  if (planet) categories.add(planetCategories[planet]);
  for (const [trait, category] of Object.entries(planetCategories)) {
    if (base.traits.includes(trait)) categories.add(category);
  }

  if (!baseSpecialNames[base.cardId]) categories.add('nonbasic');
  if (categories.size === 0) categories.add('other-basic');
  return [...categories];
}

const emptyCounts = (): BaseDistributionCounts =>
  Object.fromEntries(
    baseDistributionCategories.map(category => [
      category,
      {
        count: 0,
        aspects: Object.fromEntries(Object.values(SwuAspect).map(aspect => [aspect, 0])),
      },
    ]),
  ) as BaseDistributionCounts;

type LeaderBaseCounts = {
  leaderCardId: string;
  baseCardId: string;
  total: number;
  top8: number;
  winner: number;
};

export function countBaseDistribution(
  rows: readonly LeaderBaseCounts[],
  cardList: CardList,
): BaseDistributionSplit {
  const result: BaseDistributionSplit = {
    total: { deckCount: 0, categories: emptyCounts() },
    top8: { deckCount: 0, categories: emptyCounts() },
    champions: { deckCount: 0, categories: emptyCounts() },
  };

  for (const row of rows) {
    const base = cardList[row.baseCardId];
    // Unresolved bases have no reliable category or aspects.
    if (!base || base.type !== 'Base') continue;
    const categories = getBaseDistributionCategories(base);
    const leader = cardList[row.leaderCardId];
    const aspects = new Set([
      ...base.aspects,
      ...(leader?.type === 'Leader' ? leader.aspects : []),
    ]);
    const counts = { total: row.total, top8: row.top8, champions: row.winner };

    for (const part of ['total', 'top8', 'champions'] as const) {
      result[part].deckCount += counts[part];
      for (const category of categories) {
        const target = result[part].categories[category];
        target.count += counts[part];
        for (const aspect of aspects) target.aspects[aspect] += counts[part];
      }
    }
  }

  return result;
}

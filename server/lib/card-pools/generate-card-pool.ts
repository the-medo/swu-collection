import type { SwuSet } from '../../../types/enums.ts';
import { cardPoolInfo } from '../../../lib/swu-resources/card-pool-info.ts';
import {
  CardPoolType,
  DEFAULT_CARD_POOL_BOOSTER_COUNT,
  type CardPoolBoosterCount,
} from '../../../shared/types/cardPools.ts';
import { type CardPoolMap, getCardPoolMap } from './card-pool-map-by-set.ts';
import type { CardList } from '../../../lib/swu-resources/types.ts';
import { getBoosterPackRules } from './booster-pack-rules.ts';

export type BoosterPack = string[];

export const RARE_LEADER_CHANCE = 4 / 24;
// All supported sealed sets are JTL or later; FFG gives approximately 1 in 5.
// https://starwarsunlimited.com/articles/updates-and-rotations
export const LEGENDARY_CHANCE = 1 / 5;
const FOIL_SPECIAL_CHANCE = 0.04;
const FOIL_UNCOMMON_CHANCE = 0.23;
type Random = () => number;

const selectCardFromPool = (pool: string[], random: Random) => {
  if (pool.length === 0) throw new Error('Cannot draw from an empty booster slot');
  return pool[Math.floor(random() * pool.length)];
};

const selectDistinctCards = (pool: string[], count: number, random: Random) => {
  if (pool.length < count) throw new Error(`Booster slot needs ${count} distinct cards`);
  // Partial Fisher-Yates: bounded work even with a constant random source, and
  // never mutate the cached catalog shared by other packs/requests.
  const cards = [...pool];
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(random() * (cards.length - i));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards.slice(0, count);
};

export const generateBoosterPack = (
  cardPoolMap: CardPoolMap,
  random: Random = Math.random,
): BoosterPack => {
  const rules = getBoosterPackRules(cardPoolMap.set);
  const leaderPool =
    random() < RARE_LEADER_CHANCE ? cardPoolMap.leaders.Rare : cardPoolMap.leaders.Common;
  const rareSlotPool =
    random() < LEGENDARY_CHANCE ? cardPoolMap.cards.Legendary : cardPoolMap.cards.Rare;

  const foilRoll = random();
  const specialThreshold = rules.foilLegendaryChance + FOIL_SPECIAL_CHANCE;
  const rareThreshold = specialThreshold + rules.foilRareChance;
  const foilPool =
    foilRoll < rules.foilLegendaryChance
      ? cardPoolMap.foil.Legendary
      : foilRoll < specialThreshold
        ? cardPoolMap.foil.Special
        : foilRoll < rareThreshold
          ? cardPoolMap.foil.Rare
          : foilRoll < rareThreshold + FOIL_UNCOMMON_CHANCE
            ? cardPoolMap.foil.Uncommon
            : cardPoolMap.foil.Common;

  const hasHyperspaceCommon = random() < rules.hyperspaceCommonChance;
  const bonusRoll = random();
  const hyperspaceRareThreshold = rules.prestigeChance + rules.hyperspaceRareChance;
  // An upgrade replaces the third uncommon; otherwise all three regular
  // uncommons are distinct. Premium slots draw independently and can repeat
  // cards from regular slots. Unpublished cosmetic U odds are not modeled.
  const bonusPool =
    bonusRoll < rules.prestigeChance
      ? cardPoolMap.prestige
      : bonusRoll < hyperspaceRareThreshold
        ? cardPoolMap.hyperspace.Rare
        : bonusRoll < hyperspaceRareThreshold + rules.hyperspaceLegendaryChance
          ? cardPoolMap.hyperspace.Legendary
          : undefined;

  return [
    selectCardFromPool(leaderPool, random),
    ...selectDistinctCards(cardPoolMap.cards.Common, hasHyperspaceCommon ? 8 : 9, random),
    ...(hasHyperspaceCommon ? [selectCardFromPool(cardPoolMap.hyperspace.Common, random)] : []),
    ...selectDistinctCards(cardPoolMap.cards.Uncommon, bonusPool ? 2 : 3, random),
    ...(bonusPool ? [selectCardFromPool(bonusPool, random)] : []),
    selectCardFromPool(rareSlotPool, random),
    selectCardFromPool(foilPool, random),
  ];
};

export const generateCardPool = (
  s: SwuSet,
  type: CardPoolType,
  boosterCount: CardPoolBoosterCount = DEFAULT_CARD_POOL_BOOSTER_COUNT,
  random: Random = Math.random,
) => {
  if (!cardPoolInfo[s]) throw new Error(`No card pool info found for set ${s}`);
  if (type === CardPoolType.Draft) throw new Error(`Draft card pools not implemented yet`);

  const cardPoolMap = getCardPoolMap(s);

  const finalPool: string[] = [];
  if (type === CardPoolType.Prerelease && cardPoolInfo[s].hasPrerelease) {
    finalPool.push(...cardPoolInfo[s].prereleaseLeadersId);
  }
  for (let i = 0; i < boosterCount; i++) {
    finalPool.push(...generateBoosterPack(cardPoolMap, random));
  }

  return finalPool;
};

export const filterLeadersFromCardPool = (cardPool: string[], cards: CardList) =>
  cardPool.filter(cardId => cards[cardId]?.type === 'Leader');

export const transformCardPoolToCardPoolCards = (cardPool: string[], cardPoolId: string) =>
  cardPool.map((cardId, i) => ({ cardPoolId, cardId, cardPoolNumber: i + 1 }));

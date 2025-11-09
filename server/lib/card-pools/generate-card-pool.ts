import type { SwuSet } from '../../../types/enums.ts';
import { cardPoolInfo } from './card-pool-info.ts';
import { CardPoolType } from '../../../shared/types/cardPools.ts';
import { type CardPoolMap, getCardPoolMap } from './card-pool-map-by-set.ts';

export type BoosterPack = string[];

export const RARE_LEADER_CHANCE = 4 / 24;
export const LEGENDARY_CHANCE = 4 / 24;
export const FOIL_LEGENDARY_CHANCE = 2 / 100;
export const FOIL_SPECIAL_CHANCE = 6 / 100;
export const FOIL_RARE_CHANCE = 12 / 100;
export const FOIL_UNCOMMON_CHANCE = 35 / 100;

const selectCardFromPool = (pool: string[]) => pool[Math.floor(Math.random() * pool.length)];
const getCardsFromArrayOfPools = (pools: string[][]) => pools.map(pool => selectCardFromPool(pool));

export const generateBoosterPack = (cardPoolMap: CardPoolMap): BoosterPack => {
  const leaderPool =
    Math.random() <= RARE_LEADER_CHANCE ? cardPoolMap.leaders.Rare : cardPoolMap.leaders.Common;
  const rareSlotPool =
    Math.random() <= LEGENDARY_CHANCE ? cardPoolMap.cards.Legendary : cardPoolMap.cards.Rare;

  const foilSeed = Math.random();
  const foilPool =
    foilSeed < FOIL_LEGENDARY_CHANCE
      ? cardPoolMap.cards.Legendary
      : foilSeed < FOIL_SPECIAL_CHANCE
        ? cardPoolMap.cards.Special
        : foilSeed < FOIL_RARE_CHANCE
          ? cardPoolMap.cards.Rare
          : foilSeed < FOIL_UNCOMMON_CHANCE
            ? cardPoolMap.cards.Uncommon
            : cardPoolMap.cards.Common;

  return getCardsFromArrayOfPools([
    leaderPool,
    cardPoolMap.cards.Common,
    cardPoolMap.cards.Common,
    cardPoolMap.cards.Common,
    cardPoolMap.cards.Common,
    cardPoolMap.cards.Common,
    cardPoolMap.cards.Common,
    cardPoolMap.cards.Common,
    cardPoolMap.cards.Common,
    cardPoolMap.cards.Common,
    cardPoolMap.cards.Uncommon,
    cardPoolMap.cards.Uncommon,
    cardPoolMap.cards.Uncommon,
    rareSlotPool,
    foilPool,
  ]);
};

export const generateCardPool = (s: SwuSet, type: CardPoolType, boosterCount: number = 6) => {
  if (!cardPoolInfo[s]) throw new Error(`No card pool info found for set ${s}`);
  if (type === CardPoolType.Draft) throw new Error(`Draft card pools not implemented yet`);

  const cardPoolMap = getCardPoolMap(s);

  const finalPool: string[] = [];
  if (type === CardPoolType.Prerelease && cardPoolInfo[s].hasPrerelease) {
    finalPool.push(...cardPoolInfo[s].prereleaseLeadersId);
  }
  for (let i = 0; i < boosterCount; i++) {
    finalPool.push(...generateBoosterPack(cardPoolMap));
  }

  return finalPool;
};

export const transformCardPoolToCardPoolCards = (cardPool: string[], cardPoolId: string) =>
  cardPool.map((cardId, i) => ({ cardPoolId, cardId, cardPoolNumber: i + 1 }));

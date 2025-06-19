import { SwuSet } from '../../types/enums.ts';

export type SetInfo = {
  code: string;
  name: string;
  cardCount: number;
  sortValue: number;
  expansionId: number;
};

export const setInfo: Record<SwuSet, SetInfo> = {
  [SwuSet.SOR]: {
    code: SwuSet.SOR,
    name: 'Spark of Rebellion',
    cardCount: 252,
    sortValue: 1,
    expansionId: 2,
  },
  [SwuSet.SHD]: {
    code: SwuSet.SHD,
    name: 'Shadows of the Galaxy',
    cardCount: 262,
    sortValue: 2,
    expansionId: 8,
  },
  [SwuSet.TWI]: {
    code: SwuSet.TWI,
    name: 'Twilight of the Republic',
    cardCount: 257,
    sortValue: 3,
    expansionId: 18,
  },
  [SwuSet.JTL]: {
    code: SwuSet.JTL,
    name: 'Jump to Lightspeed',
    cardCount: 262,
    sortValue: 4,
    expansionId: 23,
  },
  [SwuSet.LOF]: {
    code: SwuSet.LOF,
    name: 'Legends of the Force',
    cardCount: 264,
    sortValue: 5,
    expansionId: 53,
  },
} as const;

export const setArray: SetInfo[] = Object.values(setInfo);

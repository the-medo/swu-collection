import { SwuSet } from '../../types/enums.ts';

export type SetInfo = {
  code: string;
  name: string;
  cardCount: number;
  sortValue: number;
  expansionId: number;
  hexColor: string;
};

export const setInfo: Record<SwuSet, SetInfo> = {
  [SwuSet.SOR]: {
    code: SwuSet.SOR,
    name: 'Spark of Rebellion',
    cardCount: 252,
    sortValue: 1,
    expansionId: 2,
    hexColor: '#e10600',
  },
  [SwuSet.SHD]: {
    code: SwuSet.SHD,
    name: 'Shadows of the Galaxy',
    cardCount: 262,
    sortValue: 2,
    expansionId: 8,
    hexColor: '#3b3fb6',
  },
  [SwuSet.TWI]: {
    code: SwuSet.TWI,
    name: 'Twilight of the Republic',
    cardCount: 257,
    sortValue: 3,
    expansionId: 18,
    hexColor: '#7c2529',
  },
  [SwuSet.JTL]: {
    code: SwuSet.JTL,
    name: 'Jump to Lightspeed',
    cardCount: 262,
    sortValue: 4,
    expansionId: 23,
    hexColor: '#f2a900',
  },
  [SwuSet.LOF]: {
    code: SwuSet.LOF,
    name: 'Legends of the Force',
    cardCount: 264,
    sortValue: 5,
    expansionId: 53,
    hexColor: '#00a3e0',
  },
  [SwuSet.IBH]: {
    code: SwuSet.IBH,
    name: 'Intro Battle: Hoth',
    cardCount: 104,
    sortValue: 6,
    expansionId: 68,
    hexColor: '#d1eee3',
  },
  [SwuSet.SEC]: {
    code: SwuSet.SEC,
    name: 'Secrets of Power',
    cardCount: 264,
    sortValue: 7,
    expansionId: 73,
    hexColor: '#68177f',
  },
} as const;

export const setArray: SetInfo[] = Object.values(setInfo);
export const setArraySorted: SwuSet[] = Object.values(setInfo)
  .sort((a, b) => b.sortValue - a.sortValue)
  .map(s => s.code as SwuSet);

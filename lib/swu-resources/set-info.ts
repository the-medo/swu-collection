import { SwuSet } from '../../types/enums.ts';

export type RotationBlock = {
  id: number;
  year: number;
  name: string;
  hexColor: string;
  setMap: Partial<Record<SwuSet, true>>;
};

export type SetInfo = {
  code: string;
  name: string;
  cardCount: number;
  sortValue: number;
  expansionId: number;
  hexColor: string;
  rotationBlockId?: number;
};

export const rotationBlocks: Record<number | string, RotationBlock> = {
  1: {
    id: 1,
    year: 2024,
    name: 'Block 1 (SOR, SHD, TWI)',
    hexColor: '#e10600',
    setMap: {
      [SwuSet.SOR]: true,
      [SwuSet.SHD]: true,
      [SwuSet.TWI]: true,
    },
  },
  2: {
    id: 2,
    year: 2025,
    name: 'Block 2 (JTL, LOF, SEC + IBH)',
    hexColor: '#f2a900',
    setMap: {
      [SwuSet.JTL]: true,
      [SwuSet.LOF]: true,
      [SwuSet.IBH]: true,
      [SwuSet.SEC]: true,
    },
  },
  3: {
    id: 3,
    year: 2026,
    name: 'Block 3 (LAW)',
    hexColor: '#4782c6',
    setMap: {
      [SwuSet.LAW]: true,
    },
  },
};

export const setInfo: Record<SwuSet, SetInfo> = {
  [SwuSet.SOR]: {
    code: SwuSet.SOR,
    name: 'Spark of Rebellion',
    cardCount: 252,
    sortValue: 1,
    expansionId: 2,
    hexColor: '#e10600',
    rotationBlockId: 1,
  },
  [SwuSet.SHD]: {
    code: SwuSet.SHD,
    name: 'Shadows of the Galaxy',
    cardCount: 262,
    sortValue: 2,
    expansionId: 8,
    hexColor: '#3b3fb6',
    rotationBlockId: 1,
  },
  [SwuSet.TWI]: {
    code: SwuSet.TWI,
    name: 'Twilight of the Republic',
    cardCount: 257,
    sortValue: 3,
    expansionId: 18,
    hexColor: '#7c2529',
    rotationBlockId: 1,
  },
  [SwuSet.JTL]: {
    code: SwuSet.JTL,
    name: 'Jump to Lightspeed',
    cardCount: 262,
    sortValue: 4,
    expansionId: 23,
    hexColor: '#f2a900',
    rotationBlockId: 2,
  },
  [SwuSet.LOF]: {
    code: SwuSet.LOF,
    name: 'Legends of the Force',
    cardCount: 264,
    sortValue: 5,
    expansionId: 53,
    hexColor: '#00a3e0',
    rotationBlockId: 2,
  },
  [SwuSet.IBH]: {
    code: SwuSet.IBH,
    name: 'Intro Battle: Hoth',
    cardCount: 104,
    sortValue: 6,
    expansionId: 68,
    hexColor: '#d1eee3',
    rotationBlockId: 2,
  },
  [SwuSet.SEC]: {
    code: SwuSet.SEC,
    name: 'Secrets of Power',
    cardCount: 264,
    sortValue: 7,
    expansionId: 73,
    hexColor: '#68177f',
    rotationBlockId: 2,
  },
  [SwuSet.LAW]: {
    code: SwuSet.LAW,
    name: 'A Lawless Time',
    cardCount: 264,
    sortValue: 8,
    expansionId: 93,
    hexColor: '#df7826',
    rotationBlockId: 3,
  },
} as const;

export const setArray: SetInfo[] = Object.values(setInfo);
export const setArraySorted: SwuSet[] = Object.values(setInfo)
  .sort((a, b) => b.sortValue - a.sortValue)
  .map(s => s.code as SwuSet);

export const rotationBlockArray: RotationBlock[] = Object.values(rotationBlocks);

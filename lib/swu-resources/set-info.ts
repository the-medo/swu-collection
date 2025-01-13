export type SetInfo = {
  code: string;
  name: string;
  cardCount: number;
  sortValue: number;
  expansionId: number;
};

export const setInfo: Record<string, SetInfo | undefined> = {
  sor: {
    code: 'SOR',
    name: 'Spark of Rebellion',
    cardCount: 252,
    sortValue: 1,
    expansionId: 2,
  },
  shd: {
    code: 'SHD',
    name: 'Shadows of the Galaxy',
    cardCount: 262,
    sortValue: 2,
    expansionId: 8,
  },
  twi: {
    code: 'TWI',
    name: 'Twilight of the Republic',
    cardCount: 257,
    sortValue: 3,
    expansionId: 18,
  },
} as const;

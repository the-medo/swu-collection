import { ic27Unit } from './define.ts';

export const ic27EnfysNestNoMore = ic27Unit('enfys-nest--no-more', {
  keywords: ['Ambush'],
  constant: [
    {
      condition: {
        kind: 'attacking-unit',
        filter: {
          maxCost: 3,
        },
      },
      power: 2,
      abilities: {
        keywords: ['Overwhelm'],
      },
    },
  ],
});

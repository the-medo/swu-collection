import { ic27Unit } from './define.ts';

export const ic27FinnStandAndFight = ic27Unit('finn--stand-and-fight', {
  keywords: ['Sentinel'],
  constant: [
    {
      condition: {
        kind: 'unit-matches',
        target: 'source',
        filter: {
          upgraded: true,
        },
      },
      abilities: {
        restore: 2,
      },
    },
  ],
});

import { ic27Unit } from './define.ts';

export const ic27GrandInquisitorHowTheMightyWillFall = ic27Unit(
  'grand-inquisitor--how-the-mighty-will-fall',
  {
    constant: [
      {
        condition: {
          kind: 'unit-matches',
          target: 'source',
          filter: {
            damaged: true,
          },
        },
        abilities: {
          raid: 3,
          keywords: ['Saboteur'],
        },
      },
    ],
  },
);

import { hmwUnit } from './define.ts';

export const hmwPeppiBowShaakHerder = hmwUnit('peppi-bow--shaak-herder', {
  restore: 1,
  constant: [
    {
      condition: {
        kind: 'unit-matches',
        target: 'source',
        filter: {
          upgraded: true,
        },
      },
      power: 1,
      hp: 1,
    },
  ],
});

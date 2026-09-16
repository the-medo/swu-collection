import { hmwUnit } from './define.ts';

export const hmwGungaCityGuard = hmwUnit('gunga-city-guard', {
  restore: 1,
  constant: [
    {
      condition: {
        kind: 'any',
        conditions: [
          {
            kind: 'units-at-least',
            filter: {
              controller: 'friendly',
              trait: 'Gungan',
              otherThan: 'source',
            },
            amount: 1,
          },
          {
            kind: 'controls-base-trait',
            trait: 'Naboo',
          },
        ],
      },
      abilities: {
        keywords: ['Shielded'],
      },
    },
  ],
});

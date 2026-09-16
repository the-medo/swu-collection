import { hmwUnit } from './define.ts';

export const hmwWookieeRangers = hmwUnit('wookiee-rangers', {
  constant: [
    {
      condition: {
        kind: 'any',
        conditions: [
          {
            kind: 'units-at-least',
            filter: {
              controller: 'friendly',
              trait: 'Wookiee',
              otherThan: 'source',
            },
            amount: 1,
          },
          {
            kind: 'controls-base-trait',
            trait: 'Kashyyyk',
          },
        ],
      },
      abilities: {
        keywords: ['Sentinel'],
      },
    },
  ],
});

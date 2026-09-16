import { hmwUnit } from './define.ts';

export const hmwStormtrooperPatrol = hmwUnit('stormtrooper-patrol--', {
  keywords: ['Sentinel'],
  constant: [
    {
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'friendly',
          otherThan: 'source',
          minCost: 3,
        },
        amount: 1,
      },
      power: 2,
    },
  ],
});

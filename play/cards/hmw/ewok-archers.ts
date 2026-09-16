import { hmwUnit } from './define.ts';

export const hmwEwokArchers = hmwUnit('ewok-archers', {
  constant: [
    {
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'friendly',
          otherThan: 'source',
          maxCost: 3,
        },
        amount: 1,
      },
      abilities: {
        keywords: ['Ambush'],
      },
    },
  ],
});

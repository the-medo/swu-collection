import { hmwUnit } from './define.ts';

export const hmwDarthVaderAnyMethodsNecessary = hmwUnit('darth-vader--any-methods-necessary', {
  keywords: ['Saboteur'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'search-deck',
          count: 8,
          filter: 'unit',
          cardFilter: { maxCost: 4 },
          max: 2,
          play: {
            discount: 0,
            free: true,
            after: [{ kind: 'damage-target', target: 'played', amount: 2 }],
          },
        },
      ],
    },
  ],
});

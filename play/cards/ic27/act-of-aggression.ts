import { ic27Event } from './define.ts';

export const ic27ActOfAggression = ic27Event('act-of-aggression', [
  {
    kind: 'draw-cards',
    amount: 1,
  },
  {
    kind: 'damage-unit',
    amount: 3,
    arena: 'any',
    optional: true,
  },
  {
    kind: 'select-unit',
    filter: {
      controller: 'friendly',
    },
    bind: 'chosen',
    optional: false,
    effects: [
      {
        kind: 'on-unit',
        target: 'chosen',
        operation: {
          kind: 'modify',
          power: 3,
          hp: 0,
          duration: 'phase',
          abilities: {
            keywords: ['Overwhelm'],
          },
        },
      },
    ],
  },
]);

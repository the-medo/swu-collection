import { ic27Unit } from './define.ts';

export const ic27ReyEmbracingDestiny = ic27Unit('rey--embracing-destiny', {
  actions: [
    {
      id: 'action',
      costs: [
        {
          kind: 'resources',
          amount: 1,
        },
        {
          kind: 'discard-hand',
          count: 1,
        },
      ],
      limit: null,
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
          },
          bind: 'chosen',
          optional: false,
          effects: [
            {
              kind: 'attack-bound',
              target: 'chosen',
              optional: false,
              powerBonus: 2,
            },
          ],
          forAttack: {},
        },
      ],
    },
  ],
});

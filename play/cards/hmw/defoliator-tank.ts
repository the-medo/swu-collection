import { hmwUnit } from './define.ts';

export const hmwDefoliatorTank = hmwUnit('defoliator-tank', {
  keywords: ['Overwhelm'],
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'all',
            conditions: [
              {
                kind: 'unit-matches',
                target: 'defender',
                filter: {},
              },
              {
                kind: 'not',
                condition: {
                  kind: 'unit-matches',
                  target: 'defender',
                  filter: {
                    anyTrait: ['Droid', 'Vehicle'],
                  },
                },
              },
            ],
          },
          effects: [
            {
              kind: 'pay',
              costs: [
                {
                  kind: 'resources',
                  amount: 2,
                },
              ],
              optional: true,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'defender',
                  operation: {
                    kind: 'give-token',
                    token: 'weakness',
                    count: 2,
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});

import { hmwUnit } from './define.ts';

export const hmwDragonboatFreighter = hmwUnit('dragonboat-freighter', {
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {},
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'give-token',
                token: 'weakness',
                count: 1,
              },
            },
            {
              kind: 'if',
              condition: {
                kind: 'unit-matches',
                target: 'chosen',
                filter: {
                  unique: true,
                },
              },
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'exhaust',
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

import { hmwUnit } from './define.ts';

export const hmwOccupationOfficer = hmwUnit('occupation-officer', {
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'numeric-at-least',
            value: {
              kind: 'zone-size',
              zone: 'resources',
              player: 'self',
            },
            amount: 6,
          },
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
              ],
            },
          ],
        },
      ],
    },
  ],
});

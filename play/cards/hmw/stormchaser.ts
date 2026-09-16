import { hmwUnit } from './define.ts';

export const hmwStormchaser = hmwUnit('stormchaser', {
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'inspect-zone',
          zone: 'hand',
          player: 'self',
          chooser: 'self',
          filter: {
            trait: 'Disaster',
          },
          min: 0,
          max: 1,
          bind: 'revealed',
          group: 'revealed',
          reveal: true,
          effects: [],
          after: [
            {
              kind: 'if',
              condition: {
                kind: 'any',
                conditions: [
                  {
                    kind: 'numeric-at-least',
                    value: {
                      kind: 'group-size',
                      group: 'revealed',
                    },
                    amount: 1,
                  },
                  {
                    kind: 'numeric-at-least',
                    value: {
                      kind: 'zone-size',
                      zone: 'discard',
                      player: 'self',
                      filter: {
                        trait: 'Disaster',
                      },
                    },
                    amount: 1,
                  },
                ],
              },
              effects: [
                {
                  kind: 'draw-cards',
                  amount: 1,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});

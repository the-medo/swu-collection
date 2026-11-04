import { ic27Unit } from './define.ts';

export const ic27MillenniumFalconYaHoo = ic27Unit('millennium-falcon--ya-hoo', {
  triggers: [
    {
      id: 'attack-ended',
      timing: 'attack-ended',
      effects: [
        {
          kind: 'pay',
          costs: [
            {
              kind: 'resources',
              amount: 1,
            },
          ],
          optional: true,
          effects: [
            {
              kind: 'select-unit',
              filter: {
                controller: 'friendly',
                maxCost: 3,
              },
              bind: 'chosen',
              optional: false,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'return-to-hand',
                  },
                  ifYouDo: [
                    {
                      kind: 'play-card',
                      target: 'chosen',
                      from: 'hand',
                      filter: {
                        kind: 'unit',
                        owner: 'self',
                      },
                      free: true,
                      optional: true,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});

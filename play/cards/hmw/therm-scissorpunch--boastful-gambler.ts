import { hmwUnit } from './define.ts';

export const hmwThermScissorpunchBoastfulGambler = hmwUnit('therm-scissorpunch--boastful-gambler', {
  triggers: [
    {
      id: 'action-start',
      timing: 'action-start',
      effects: [
        {
          kind: 'reveal-top',
          player: 'self',
          bind: 'own',
          effects: [
            {
              kind: 'if',
              condition: {
                kind: 'card-matches',
                target: 'own',
                filter: {
                  minCost: 3,
                },
              },
              effects: [
                {
                  kind: 'on-unit',
                  target: 'source',
                  operation: {
                    kind: 'modify',
                    power: -2,
                    hp: -2,
                    duration: 'phase',
                  },
                },
              ],
            },
            {
              kind: 'reveal-top',
              player: 'enemy',
              bind: 'enemy',
              effects: [
                {
                  kind: 'if',
                  condition: {
                    kind: 'card-matches',
                    target: 'enemy',
                    filter: {
                      minCost: 3,
                    },
                  },
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'source',
                      operation: {
                        kind: 'modify',
                        power: -2,
                        hp: -2,
                        duration: 'phase',
                      },
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

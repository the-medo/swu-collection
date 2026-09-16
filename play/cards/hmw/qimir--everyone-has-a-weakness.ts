import { hmwUnit } from './define.ts';

export const hmwQimirEveryoneHasAWeakness = hmwUnit('qimir--everyone-has-a-weakness', {
  triggers: [
    {
      id: 'defeated',
      timing: 'defeated',
      optional: true,
      effects: [
        {
          kind: 'mill',
          player: 'self',
          count: 1,
          bind: 'discarded',
          effects: [
            {
              kind: 'if',
              condition: {
                kind: 'card-matches',
                target: 'discarded',
                filter: {
                  withoutAspect: 'Villainy',
                },
              },
              effects: [
                {
                  kind: 'select-unit',
                  filter: {
                    controller: 'enemy',
                  },
                  bind: 'chosen',
                  optional: false,
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
    },
  ],
});

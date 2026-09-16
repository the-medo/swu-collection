import { hmwUnit } from './define.ts';

export const hmwDookuCorruptionMustBeEradicated = hmwUnit('dooku--corruption-must-be-eradicated', {
  keywords: ['Overwhelm'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            otherThan: 'source',
          },
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'ready',
              },
              ifYouDo: [
                {
                  kind: 'select-target',
                  bases: 'any',
                  bind: 'base',
                  optional: false,
                  effects: [
                    {
                      kind: 'heal-target',
                      target: 'base',
                      amount: {
                        kind: 'card-cost',
                        target: 'chosen',
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

import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteUnlimitedPower = {
  cardId: 'unlimited-power',
  name: 'Unlimited Power',
  kind: 'event',
  aspects: ['Aggression', 'Aggression'],
  traits: ['Force'],
  cost: 6,
  effects: [
    {
      kind: 'select-unit',
      filter: {},
      optional: false,
      bind: 'first',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            otherThan: 'first',
          },
          optional: false,
          bind: 'second',
          effects: [
            {
              kind: 'select-unit',
              filter: {
                otherThanAny: ['first', 'second'],
              },
              optional: false,
              bind: 'third',
              effects: [
                {
                  kind: 'select-unit',
                  filter: {
                    otherThanAny: ['first', 'second', 'third'],
                  },
                  optional: false,
                  bind: 'fourth',
                  effects: [
                    {
                      kind: 'damage-assignments',
                      assignments: [
                        {
                          target: 'first',
                          amount: 4,
                        },
                        {
                          target: 'second',
                          amount: 3,
                        },
                        {
                          target: 'third',
                          amount: 2,
                        },
                        {
                          target: 'fourth',
                          amount: 1,
                        },
                      ],
                    },
                  ],
                  allowMissing: true,
                },
              ],
              allowMissing: true,
            },
          ],
          allowMissing: true,
        },
      ],
      allowMissing: true,
    },
  ],
} as const satisfies EventDefinition;

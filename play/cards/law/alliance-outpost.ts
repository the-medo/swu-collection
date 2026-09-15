import type { BaseDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 ability costs fixture.
export const allianceOutpost = {
  cardId: 'alliance-outpost',
  name: 'Alliance Outpost',
  kind: 'base',
  aspects: ['Vigilance'],
  traits: [],
  hp: 26,
  actions: [
    {
      id: 'exchange-token',
      costs: [
        {
          kind: 'defeat-friendly-token',
        },
      ],
      limit: 'once-per-game',
      effects: [
        {
          kind: 'choose-mode',
          options: [
            {
              id: 'shield',
              effects: [
                {
                  kind: 'select-unit',
                  filter: {},
                  optional: false,
                  bind: 'chosen',
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'chosen',
                      operation: {
                        kind: 'give-token',
                        token: 'shield',
                        count: 1,
                      },
                    },
                  ],
                },
              ],
            },
            {
              id: 'experience',
              effects: [
                {
                  kind: 'select-unit',
                  filter: {},
                  optional: false,
                  bind: 'chosen',
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'chosen',
                      operation: {
                        kind: 'give-token',
                        token: 'experience',
                        count: 1,
                      },
                    },
                  ],
                },
              ],
            },
            {
              id: 'credit',
              effects: [
                {
                  kind: 'create-credits',
                  amount: 1,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies BaseDefinition;

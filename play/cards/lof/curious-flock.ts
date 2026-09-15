import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-attributes.json.
export const curiousFlock = {
  cardId: 'curious-flock',
  name: 'Curious Flock',
  kind: 'unit',
  aspects: [],
  traits: ['Creature'],
  cost: 1,
  power: 1,
  hp: 1,
  arena: 'ground',
  triggers: [
    {
      id: 'buy-experience',
      timing: 'played',
      effects: [
        {
          kind: 'choose-mode',
          options: [
            {
              id: 'pay-0',
              condition: {
                kind: 'numeric-at-least',
                value: {
                  kind: 'spending-power',
                  player: 'self',
                },
                amount: 0,
              },
              effects: [
                {
                  kind: 'pay',
                  costs: [
                    {
                      kind: 'resources',
                      amount: 0,
                    },
                  ],
                  optional: false,
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'source',
                      operation: {
                        kind: 'give-token',
                        token: 'experience',
                        count: 0,
                      },
                    },
                  ],
                },
              ],
            },
            {
              id: 'pay-1',
              condition: {
                kind: 'numeric-at-least',
                value: {
                  kind: 'spending-power',
                  player: 'self',
                },
                amount: 1,
              },
              effects: [
                {
                  kind: 'pay',
                  costs: [
                    {
                      kind: 'resources',
                      amount: 1,
                    },
                  ],
                  optional: false,
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'source',
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
              id: 'pay-2',
              condition: {
                kind: 'numeric-at-least',
                value: {
                  kind: 'spending-power',
                  player: 'self',
                },
                amount: 2,
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
                  optional: false,
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'source',
                      operation: {
                        kind: 'give-token',
                        token: 'experience',
                        count: 2,
                      },
                    },
                  ],
                },
              ],
            },
            {
              id: 'pay-3',
              condition: {
                kind: 'numeric-at-least',
                value: {
                  kind: 'spending-power',
                  player: 'self',
                },
                amount: 3,
              },
              effects: [
                {
                  kind: 'pay',
                  costs: [
                    {
                      kind: 'resources',
                      amount: 3,
                    },
                  ],
                  optional: false,
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'source',
                      operation: {
                        kind: 'give-token',
                        token: 'experience',
                        count: 3,
                      },
                    },
                  ],
                },
              ],
            },
            {
              id: 'pay-4',
              condition: {
                kind: 'numeric-at-least',
                value: {
                  kind: 'spending-power',
                  player: 'self',
                },
                amount: 4,
              },
              effects: [
                {
                  kind: 'pay',
                  costs: [
                    {
                      kind: 'resources',
                      amount: 4,
                    },
                  ],
                  optional: false,
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'source',
                      operation: {
                        kind: 'give-token',
                        token: 'experience',
                        count: 4,
                      },
                    },
                  ],
                },
              ],
            },
            {
              id: 'pay-5',
              condition: {
                kind: 'numeric-at-least',
                value: {
                  kind: 'spending-power',
                  player: 'self',
                },
                amount: 5,
              },
              effects: [
                {
                  kind: 'pay',
                  costs: [
                    {
                      kind: 'resources',
                      amount: 5,
                    },
                  ],
                  optional: false,
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'source',
                      operation: {
                        kind: 'give-token',
                        token: 'experience',
                        count: 5,
                      },
                    },
                  ],
                },
              ],
            },
            {
              id: 'pay-6',
              condition: {
                kind: 'numeric-at-least',
                value: {
                  kind: 'spending-power',
                  player: 'self',
                },
                amount: 6,
              },
              effects: [
                {
                  kind: 'pay',
                  costs: [
                    {
                      kind: 'resources',
                      amount: 6,
                    },
                  ],
                  optional: false,
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'source',
                      operation: {
                        kind: 'give-token',
                        token: 'experience',
                        count: 6,
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
} as const satisfies UnitDefinition;

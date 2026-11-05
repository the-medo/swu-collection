import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteAggression = {
  cardId: 'aggression',
  name: 'Aggression',
  kind: 'event',
  aspects: ['Aggression', 'Aggression'],
  traits: ['Innate'],
  cost: 4,
  effects: [
    {
      kind: 'choose-mode',
      options: [
        {
          id: 'draw',
          effects: [
            {
              kind: 'draw-cards',
              amount: 1,
            },
            {
              kind: 'choose-mode',
              options: [
                {
                  id: 'upgrades',
                  effects: [
                    {
                      kind: 'select-upgrades',
                      filter: {},
                      min: 0,
                      max: 2,
                      bind: 'upgrades',
                      effects: [
                        {
                          kind: 'move-upgrades',
                          group: 'upgrades',
                          to: 'discard',
                        },
                      ],
                    },
                  ],
                },
                {
                  id: 'ready',
                  effects: [
                    {
                      kind: 'select-unit',
                      filter: {
                        powerAtMost: 3,
                      },
                      optional: false,
                      bind: 'chosen',
                      effects: [
                        {
                          kind: 'on-unit',
                          target: 'chosen',
                          operation: {
                            kind: 'ready',
                          },
                        },
                      ],
                    },
                  ],
                },
                {
                  id: 'damage',
                  effects: [
                    {
                      kind: 'select-unit',
                      filter: {},
                      optional: false,
                      bind: 'chosen',
                      effects: [
                        {
                          kind: 'damage-target',
                          target: 'chosen',
                          amount: 4,
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          id: 'upgrades',
          effects: [
            {
              kind: 'select-upgrades',
              filter: {},
              min: 0,
              max: 2,
              bind: 'upgrades',
              effects: [
                {
                  kind: 'move-upgrades',
                  group: 'upgrades',
                  to: 'discard',
                },
              ],
            },
            {
              kind: 'choose-mode',
              options: [
                {
                  id: 'draw',
                  effects: [
                    {
                      kind: 'draw-cards',
                      amount: 1,
                    },
                  ],
                },
                {
                  id: 'ready',
                  effects: [
                    {
                      kind: 'select-unit',
                      filter: {
                        powerAtMost: 3,
                      },
                      optional: false,
                      bind: 'chosen',
                      effects: [
                        {
                          kind: 'on-unit',
                          target: 'chosen',
                          operation: {
                            kind: 'ready',
                          },
                        },
                      ],
                    },
                  ],
                },
                {
                  id: 'damage',
                  effects: [
                    {
                      kind: 'select-unit',
                      filter: {},
                      optional: false,
                      bind: 'chosen',
                      effects: [
                        {
                          kind: 'damage-target',
                          target: 'chosen',
                          amount: 4,
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          id: 'ready',
          effects: [
            {
              kind: 'select-unit',
              filter: {
                powerAtMost: 3,
              },
              optional: false,
              bind: 'chosen',
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'ready',
                  },
                },
              ],
            },
            {
              kind: 'choose-mode',
              options: [
                {
                  id: 'draw',
                  effects: [
                    {
                      kind: 'draw-cards',
                      amount: 1,
                    },
                  ],
                },
                {
                  id: 'upgrades',
                  effects: [
                    {
                      kind: 'select-upgrades',
                      filter: {},
                      min: 0,
                      max: 2,
                      bind: 'upgrades',
                      effects: [
                        {
                          kind: 'move-upgrades',
                          group: 'upgrades',
                          to: 'discard',
                        },
                      ],
                    },
                  ],
                },
                {
                  id: 'damage',
                  effects: [
                    {
                      kind: 'select-unit',
                      filter: {},
                      optional: false,
                      bind: 'chosen',
                      effects: [
                        {
                          kind: 'damage-target',
                          target: 'chosen',
                          amount: 4,
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          id: 'damage',
          effects: [
            {
              kind: 'select-unit',
              filter: {},
              optional: false,
              bind: 'chosen',
              effects: [
                {
                  kind: 'damage-target',
                  target: 'chosen',
                  amount: 4,
                },
              ],
            },
            {
              kind: 'choose-mode',
              options: [
                {
                  id: 'draw',
                  effects: [
                    {
                      kind: 'draw-cards',
                      amount: 1,
                    },
                  ],
                },
                {
                  id: 'upgrades',
                  effects: [
                    {
                      kind: 'select-upgrades',
                      filter: {},
                      min: 0,
                      max: 2,
                      bind: 'upgrades',
                      effects: [
                        {
                          kind: 'move-upgrades',
                          group: 'upgrades',
                          to: 'discard',
                        },
                      ],
                    },
                  ],
                },
                {
                  id: 'ready',
                  effects: [
                    {
                      kind: 'select-unit',
                      filter: {
                        powerAtMost: 3,
                      },
                      optional: false,
                      bind: 'chosen',
                      effects: [
                        {
                          kind: 'on-unit',
                          target: 'chosen',
                          operation: {
                            kind: 'ready',
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
    },
  ],
} as const satisfies EventDefinition;

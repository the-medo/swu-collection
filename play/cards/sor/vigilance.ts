import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteVigilance = {
  cardId: 'vigilance',
  name: 'Vigilance',
  kind: 'event',
  aspects: ['Vigilance', 'Vigilance'],
  traits: ['Innate'],
  cost: 4,
  effects: [
    {
      kind: 'choose-mode',
      options: [
        {
          id: 'mill',
          effects: [
            {
              kind: 'mill',
              player: 'enemy',
              count: 6,
              bind: 'milled',
              effects: [],
            },
            {
              kind: 'choose-mode',
              options: [
                {
                  id: 'heal',
                  effects: [
                    {
                      kind: 'select-target',
                      bases: 'any',
                      bind: 'chosen',
                      optional: false,
                      effects: [
                        {
                          kind: 'heal-target',
                          target: 'chosen',
                          amount: 5,
                        },
                      ],
                    },
                  ],
                },
                {
                  id: 'defeat',
                  effects: [
                    {
                      kind: 'select-unit',
                      filter: {
                        remainingHpAtMost: 3,
                      },
                      optional: false,
                      bind: 'chosen',
                      effects: [
                        {
                          kind: 'on-unit',
                          target: 'chosen',
                          operation: {
                            kind: 'defeat',
                          },
                        },
                      ],
                    },
                  ],
                },
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
              ],
            },
          ],
        },
        {
          id: 'heal',
          effects: [
            {
              kind: 'select-target',
              bases: 'any',
              bind: 'chosen',
              optional: false,
              effects: [
                {
                  kind: 'heal-target',
                  target: 'chosen',
                  amount: 5,
                },
              ],
            },
            {
              kind: 'choose-mode',
              options: [
                {
                  id: 'mill',
                  effects: [
                    {
                      kind: 'mill',
                      player: 'enemy',
                      count: 6,
                      bind: 'milled',
                      effects: [],
                    },
                  ],
                },
                {
                  id: 'defeat',
                  effects: [
                    {
                      kind: 'select-unit',
                      filter: {
                        remainingHpAtMost: 3,
                      },
                      optional: false,
                      bind: 'chosen',
                      effects: [
                        {
                          kind: 'on-unit',
                          target: 'chosen',
                          operation: {
                            kind: 'defeat',
                          },
                        },
                      ],
                    },
                  ],
                },
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
              ],
            },
          ],
        },
        {
          id: 'defeat',
          effects: [
            {
              kind: 'select-unit',
              filter: {
                remainingHpAtMost: 3,
              },
              optional: false,
              bind: 'chosen',
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'defeat',
                  },
                },
              ],
            },
            {
              kind: 'choose-mode',
              options: [
                {
                  id: 'mill',
                  effects: [
                    {
                      kind: 'mill',
                      player: 'enemy',
                      count: 6,
                      bind: 'milled',
                      effects: [],
                    },
                  ],
                },
                {
                  id: 'heal',
                  effects: [
                    {
                      kind: 'select-target',
                      bases: 'any',
                      bind: 'chosen',
                      optional: false,
                      effects: [
                        {
                          kind: 'heal-target',
                          target: 'chosen',
                          amount: 5,
                        },
                      ],
                    },
                  ],
                },
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
              ],
            },
          ],
        },
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
            {
              kind: 'choose-mode',
              options: [
                {
                  id: 'mill',
                  effects: [
                    {
                      kind: 'mill',
                      player: 'enemy',
                      count: 6,
                      bind: 'milled',
                      effects: [],
                    },
                  ],
                },
                {
                  id: 'heal',
                  effects: [
                    {
                      kind: 'select-target',
                      bases: 'any',
                      bind: 'chosen',
                      optional: false,
                      effects: [
                        {
                          kind: 'heal-target',
                          target: 'chosen',
                          amount: 5,
                        },
                      ],
                    },
                  ],
                },
                {
                  id: 'defeat',
                  effects: [
                    {
                      kind: 'select-unit',
                      filter: {
                        remainingHpAtMost: 3,
                      },
                      optional: false,
                      bind: 'chosen',
                      effects: [
                        {
                          kind: 'on-unit',
                          target: 'chosen',
                          operation: {
                            kind: 'defeat',
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

import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteDonTGetCocky = {
  cardId: 'don-t-get-cocky',
  name: "Don't Get Cocky",
  kind: 'event',
  aspects: ['Cunning'],
  traits: ['Gambit'],
  cost: 4,
  effects: [
    {
      kind: 'select-unit',
      filter: {},
      optional: false,
      bind: 'chosen',
      effects: [
        {
          kind: 'reveal-deck-cards',
          player: 'self',
          count: 1,
          offset: 0,
          append: true,
          group: 'revealed',
          effects: [
            {
              kind: 'if',
              condition: {
                kind: 'value-at-least',
                name: 'revealed-count',
                amount: 1,
              },
              effects: [
                {
                  kind: 'choose-mode',
                  options: [
                    {
                      id: 'stop',
                      effects: [
                        {
                          kind: 'if',
                          condition: {
                            kind: 'numeric-at-least',
                            value: {
                              kind: 'group-stat-sum',
                              group: 'revealed',
                              stat: 'cost',
                            },
                            amount: 8,
                          },
                          effects: [],
                          otherwise: [
                            {
                              kind: 'damage-target',
                              target: 'chosen',
                              amount: {
                                kind: 'group-stat-sum',
                                group: 'revealed',
                                stat: 'cost',
                              },
                            },
                          ],
                        },
                        {
                          kind: 'bottom-deck-group',
                          group: 'revealed',
                        },
                      ],
                    },
                    {
                      id: 'continue',
                      effects: [
                        {
                          kind: 'reveal-deck-cards',
                          player: 'self',
                          count: 1,
                          offset: 1,
                          append: true,
                          group: 'revealed',
                          effects: [
                            {
                              kind: 'if',
                              condition: {
                                kind: 'value-at-least',
                                name: 'revealed-count',
                                amount: 1,
                              },
                              effects: [
                                {
                                  kind: 'choose-mode',
                                  options: [
                                    {
                                      id: 'stop',
                                      effects: [
                                        {
                                          kind: 'if',
                                          condition: {
                                            kind: 'numeric-at-least',
                                            value: {
                                              kind: 'group-stat-sum',
                                              group: 'revealed',
                                              stat: 'cost',
                                            },
                                            amount: 8,
                                          },
                                          effects: [],
                                          otherwise: [
                                            {
                                              kind: 'damage-target',
                                              target: 'chosen',
                                              amount: {
                                                kind: 'group-stat-sum',
                                                group: 'revealed',
                                                stat: 'cost',
                                              },
                                            },
                                          ],
                                        },
                                        {
                                          kind: 'bottom-deck-group',
                                          group: 'revealed',
                                        },
                                      ],
                                    },
                                    {
                                      id: 'continue',
                                      effects: [
                                        {
                                          kind: 'reveal-deck-cards',
                                          player: 'self',
                                          count: 1,
                                          offset: 2,
                                          append: true,
                                          group: 'revealed',
                                          effects: [
                                            {
                                              kind: 'if',
                                              condition: {
                                                kind: 'value-at-least',
                                                name: 'revealed-count',
                                                amount: 1,
                                              },
                                              effects: [
                                                {
                                                  kind: 'choose-mode',
                                                  options: [
                                                    {
                                                      id: 'stop',
                                                      effects: [
                                                        {
                                                          kind: 'if',
                                                          condition: {
                                                            kind: 'numeric-at-least',
                                                            value: {
                                                              kind: 'group-stat-sum',
                                                              group: 'revealed',
                                                              stat: 'cost',
                                                            },
                                                            amount: 8,
                                                          },
                                                          effects: [],
                                                          otherwise: [
                                                            {
                                                              kind: 'damage-target',
                                                              target: 'chosen',
                                                              amount: {
                                                                kind: 'group-stat-sum',
                                                                group: 'revealed',
                                                                stat: 'cost',
                                                              },
                                                            },
                                                          ],
                                                        },
                                                        {
                                                          kind: 'bottom-deck-group',
                                                          group: 'revealed',
                                                        },
                                                      ],
                                                    },
                                                    {
                                                      id: 'continue',
                                                      effects: [
                                                        {
                                                          kind: 'reveal-deck-cards',
                                                          player: 'self',
                                                          count: 1,
                                                          offset: 3,
                                                          append: true,
                                                          group: 'revealed',
                                                          effects: [
                                                            {
                                                              kind: 'if',
                                                              condition: {
                                                                kind: 'value-at-least',
                                                                name: 'revealed-count',
                                                                amount: 1,
                                                              },
                                                              effects: [
                                                                {
                                                                  kind: 'choose-mode',
                                                                  options: [
                                                                    {
                                                                      id: 'stop',
                                                                      effects: [
                                                                        {
                                                                          kind: 'if',
                                                                          condition: {
                                                                            kind: 'numeric-at-least',
                                                                            value: {
                                                                              kind: 'group-stat-sum',
                                                                              group: 'revealed',
                                                                              stat: 'cost',
                                                                            },
                                                                            amount: 8,
                                                                          },
                                                                          effects: [],
                                                                          otherwise: [
                                                                            {
                                                                              kind: 'damage-target',
                                                                              target: 'chosen',
                                                                              amount: {
                                                                                kind: 'group-stat-sum',
                                                                                group: 'revealed',
                                                                                stat: 'cost',
                                                                              },
                                                                            },
                                                                          ],
                                                                        },
                                                                        {
                                                                          kind: 'bottom-deck-group',
                                                                          group: 'revealed',
                                                                        },
                                                                      ],
                                                                    },
                                                                    {
                                                                      id: 'continue',
                                                                      effects: [
                                                                        {
                                                                          kind: 'reveal-deck-cards',
                                                                          player: 'self',
                                                                          count: 1,
                                                                          offset: 4,
                                                                          append: true,
                                                                          group: 'revealed',
                                                                          effects: [
                                                                            {
                                                                              kind: 'if',
                                                                              condition: {
                                                                                kind: 'value-at-least',
                                                                                name: 'revealed-count',
                                                                                amount: 1,
                                                                              },
                                                                              effects: [
                                                                                {
                                                                                  kind: 'choose-mode',
                                                                                  options: [
                                                                                    {
                                                                                      id: 'stop',
                                                                                      effects: [
                                                                                        {
                                                                                          kind: 'if',
                                                                                          condition:
                                                                                            {
                                                                                              kind: 'numeric-at-least',
                                                                                              value:
                                                                                                {
                                                                                                  kind: 'group-stat-sum',
                                                                                                  group:
                                                                                                    'revealed',
                                                                                                  stat: 'cost',
                                                                                                },
                                                                                              amount: 8,
                                                                                            },
                                                                                          effects:
                                                                                            [],
                                                                                          otherwise:
                                                                                            [
                                                                                              {
                                                                                                kind: 'damage-target',
                                                                                                target:
                                                                                                  'chosen',
                                                                                                amount:
                                                                                                  {
                                                                                                    kind: 'group-stat-sum',
                                                                                                    group:
                                                                                                      'revealed',
                                                                                                    stat: 'cost',
                                                                                                  },
                                                                                              },
                                                                                            ],
                                                                                        },
                                                                                        {
                                                                                          kind: 'bottom-deck-group',
                                                                                          group:
                                                                                            'revealed',
                                                                                        },
                                                                                      ],
                                                                                    },
                                                                                    {
                                                                                      id: 'continue',
                                                                                      effects: [
                                                                                        {
                                                                                          kind: 'reveal-deck-cards',
                                                                                          player:
                                                                                            'self',
                                                                                          count: 1,
                                                                                          offset: 5,
                                                                                          append: true,
                                                                                          group:
                                                                                            'revealed',
                                                                                          effects: [
                                                                                            {
                                                                                              kind: 'if',
                                                                                              condition:
                                                                                                {
                                                                                                  kind: 'value-at-least',
                                                                                                  name: 'revealed-count',
                                                                                                  amount: 1,
                                                                                                },
                                                                                              effects:
                                                                                                [
                                                                                                  {
                                                                                                    kind: 'choose-mode',
                                                                                                    options:
                                                                                                      [
                                                                                                        {
                                                                                                          id: 'stop',
                                                                                                          effects:
                                                                                                            [
                                                                                                              {
                                                                                                                kind: 'if',
                                                                                                                condition:
                                                                                                                  {
                                                                                                                    kind: 'numeric-at-least',
                                                                                                                    value:
                                                                                                                      {
                                                                                                                        kind: 'group-stat-sum',
                                                                                                                        group:
                                                                                                                          'revealed',
                                                                                                                        stat: 'cost',
                                                                                                                      },
                                                                                                                    amount: 8,
                                                                                                                  },
                                                                                                                effects:
                                                                                                                  [],
                                                                                                                otherwise:
                                                                                                                  [
                                                                                                                    {
                                                                                                                      kind: 'damage-target',
                                                                                                                      target:
                                                                                                                        'chosen',
                                                                                                                      amount:
                                                                                                                        {
                                                                                                                          kind: 'group-stat-sum',
                                                                                                                          group:
                                                                                                                            'revealed',
                                                                                                                          stat: 'cost',
                                                                                                                        },
                                                                                                                    },
                                                                                                                  ],
                                                                                                              },
                                                                                                              {
                                                                                                                kind: 'bottom-deck-group',
                                                                                                                group:
                                                                                                                  'revealed',
                                                                                                              },
                                                                                                            ],
                                                                                                        },
                                                                                                        {
                                                                                                          id: 'continue',
                                                                                                          effects:
                                                                                                            [
                                                                                                              {
                                                                                                                kind: 'reveal-deck-cards',
                                                                                                                player:
                                                                                                                  'self',
                                                                                                                count: 1,
                                                                                                                offset: 6,
                                                                                                                append: true,
                                                                                                                group:
                                                                                                                  'revealed',
                                                                                                                effects:
                                                                                                                  [
                                                                                                                    {
                                                                                                                      kind: 'if',
                                                                                                                      condition:
                                                                                                                        {
                                                                                                                          kind: 'numeric-at-least',
                                                                                                                          value:
                                                                                                                            {
                                                                                                                              kind: 'group-stat-sum',
                                                                                                                              group:
                                                                                                                                'revealed',
                                                                                                                              stat: 'cost',
                                                                                                                            },
                                                                                                                          amount: 8,
                                                                                                                        },
                                                                                                                      effects:
                                                                                                                        [],
                                                                                                                      otherwise:
                                                                                                                        [
                                                                                                                          {
                                                                                                                            kind: 'damage-target',
                                                                                                                            target:
                                                                                                                              'chosen',
                                                                                                                            amount:
                                                                                                                              {
                                                                                                                                kind: 'group-stat-sum',
                                                                                                                                group:
                                                                                                                                  'revealed',
                                                                                                                                stat: 'cost',
                                                                                                                              },
                                                                                                                          },
                                                                                                                        ],
                                                                                                                    },
                                                                                                                    {
                                                                                                                      kind: 'bottom-deck-group',
                                                                                                                      group:
                                                                                                                        'revealed',
                                                                                                                    },
                                                                                                                  ],
                                                                                                              },
                                                                                                            ],
                                                                                                        },
                                                                                                      ],
                                                                                                  },
                                                                                                ],
                                                                                              otherwise:
                                                                                                [
                                                                                                  {
                                                                                                    kind: 'if',
                                                                                                    condition:
                                                                                                      {
                                                                                                        kind: 'numeric-at-least',
                                                                                                        value:
                                                                                                          {
                                                                                                            kind: 'group-stat-sum',
                                                                                                            group:
                                                                                                              'revealed',
                                                                                                            stat: 'cost',
                                                                                                          },
                                                                                                        amount: 8,
                                                                                                      },
                                                                                                    effects:
                                                                                                      [],
                                                                                                    otherwise:
                                                                                                      [
                                                                                                        {
                                                                                                          kind: 'damage-target',
                                                                                                          target:
                                                                                                            'chosen',
                                                                                                          amount:
                                                                                                            {
                                                                                                              kind: 'group-stat-sum',
                                                                                                              group:
                                                                                                                'revealed',
                                                                                                              stat: 'cost',
                                                                                                            },
                                                                                                        },
                                                                                                      ],
                                                                                                  },
                                                                                                  {
                                                                                                    kind: 'bottom-deck-group',
                                                                                                    group:
                                                                                                      'revealed',
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
                                                                              otherwise: [
                                                                                {
                                                                                  kind: 'if',
                                                                                  condition: {
                                                                                    kind: 'numeric-at-least',
                                                                                    value: {
                                                                                      kind: 'group-stat-sum',
                                                                                      group:
                                                                                        'revealed',
                                                                                      stat: 'cost',
                                                                                    },
                                                                                    amount: 8,
                                                                                  },
                                                                                  effects: [],
                                                                                  otherwise: [
                                                                                    {
                                                                                      kind: 'damage-target',
                                                                                      target:
                                                                                        'chosen',
                                                                                      amount: {
                                                                                        kind: 'group-stat-sum',
                                                                                        group:
                                                                                          'revealed',
                                                                                        stat: 'cost',
                                                                                      },
                                                                                    },
                                                                                  ],
                                                                                },
                                                                                {
                                                                                  kind: 'bottom-deck-group',
                                                                                  group: 'revealed',
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
                                                              otherwise: [
                                                                {
                                                                  kind: 'if',
                                                                  condition: {
                                                                    kind: 'numeric-at-least',
                                                                    value: {
                                                                      kind: 'group-stat-sum',
                                                                      group: 'revealed',
                                                                      stat: 'cost',
                                                                    },
                                                                    amount: 8,
                                                                  },
                                                                  effects: [],
                                                                  otherwise: [
                                                                    {
                                                                      kind: 'damage-target',
                                                                      target: 'chosen',
                                                                      amount: {
                                                                        kind: 'group-stat-sum',
                                                                        group: 'revealed',
                                                                        stat: 'cost',
                                                                      },
                                                                    },
                                                                  ],
                                                                },
                                                                {
                                                                  kind: 'bottom-deck-group',
                                                                  group: 'revealed',
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
                                              otherwise: [
                                                {
                                                  kind: 'if',
                                                  condition: {
                                                    kind: 'numeric-at-least',
                                                    value: {
                                                      kind: 'group-stat-sum',
                                                      group: 'revealed',
                                                      stat: 'cost',
                                                    },
                                                    amount: 8,
                                                  },
                                                  effects: [],
                                                  otherwise: [
                                                    {
                                                      kind: 'damage-target',
                                                      target: 'chosen',
                                                      amount: {
                                                        kind: 'group-stat-sum',
                                                        group: 'revealed',
                                                        stat: 'cost',
                                                      },
                                                    },
                                                  ],
                                                },
                                                {
                                                  kind: 'bottom-deck-group',
                                                  group: 'revealed',
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
                              otherwise: [
                                {
                                  kind: 'if',
                                  condition: {
                                    kind: 'numeric-at-least',
                                    value: {
                                      kind: 'group-stat-sum',
                                      group: 'revealed',
                                      stat: 'cost',
                                    },
                                    amount: 8,
                                  },
                                  effects: [],
                                  otherwise: [
                                    {
                                      kind: 'damage-target',
                                      target: 'chosen',
                                      amount: {
                                        kind: 'group-stat-sum',
                                        group: 'revealed',
                                        stat: 'cost',
                                      },
                                    },
                                  ],
                                },
                                {
                                  kind: 'bottom-deck-group',
                                  group: 'revealed',
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
              otherwise: [
                {
                  kind: 'if',
                  condition: {
                    kind: 'numeric-at-least',
                    value: {
                      kind: 'group-stat-sum',
                      group: 'revealed',
                      stat: 'cost',
                    },
                    amount: 8,
                  },
                  effects: [],
                  otherwise: [
                    {
                      kind: 'damage-target',
                      target: 'chosen',
                      amount: {
                        kind: 'group-stat-sum',
                        group: 'revealed',
                        stat: 'cost',
                      },
                    },
                  ],
                },
                {
                  kind: 'bottom-deck-group',
                  group: 'revealed',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;

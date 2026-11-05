import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteCunning = {
  cardId: 'cunning',
  name: 'Cunning',
  kind: 'event',
  aspects: ['Cunning', 'Cunning'],
  traits: ['Innate'],
  cost: 4,
  effects: [
    {
      kind: 'choose-mode',
      options: [
        {
          id: 'return',
          effects: [
            {
              kind: 'select-unit',
              filter: {
                nonLeader: true,
                powerAtMost: 4,
              },
              optional: false,
              bind: 'chosen',
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'return-to-hand',
                  },
                },
              ],
            },
            {
              kind: 'choose-mode',
              options: [
                {
                  id: 'power',
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
                            kind: 'modify',
                            power: 4,
                            hp: 0,
                            duration: 'phase',
                          },
                        },
                      ],
                    },
                  ],
                },
                {
                  id: 'exhaust',
                  effects: [
                    {
                      kind: 'select-units',
                      filter: {},
                      bind: 'chosen',
                      min: 0,
                      max: 2,
                      effects: [
                        {
                          kind: 'each-unit',
                          filter: {
                            inGroup: 'chosen',
                          },
                          bind: 'recipient',
                          effects: [
                            {
                              kind: 'on-unit',
                              target: 'recipient',
                              operation: {
                                kind: 'exhaust',
                              },
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
                {
                  id: 'discard',
                  effects: [
                    {
                      kind: 'discard-random-hand',
                      player: 'enemy',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          id: 'power',
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
                    kind: 'modify',
                    power: 4,
                    hp: 0,
                    duration: 'phase',
                  },
                },
              ],
            },
            {
              kind: 'choose-mode',
              options: [
                {
                  id: 'return',
                  effects: [
                    {
                      kind: 'select-unit',
                      filter: {
                        nonLeader: true,
                        powerAtMost: 4,
                      },
                      optional: false,
                      bind: 'chosen',
                      effects: [
                        {
                          kind: 'on-unit',
                          target: 'chosen',
                          operation: {
                            kind: 'return-to-hand',
                          },
                        },
                      ],
                    },
                  ],
                },
                {
                  id: 'exhaust',
                  effects: [
                    {
                      kind: 'select-units',
                      filter: {},
                      bind: 'chosen',
                      min: 0,
                      max: 2,
                      effects: [
                        {
                          kind: 'each-unit',
                          filter: {
                            inGroup: 'chosen',
                          },
                          bind: 'recipient',
                          effects: [
                            {
                              kind: 'on-unit',
                              target: 'recipient',
                              operation: {
                                kind: 'exhaust',
                              },
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
                {
                  id: 'discard',
                  effects: [
                    {
                      kind: 'discard-random-hand',
                      player: 'enemy',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          id: 'exhaust',
          effects: [
            {
              kind: 'select-units',
              filter: {},
              bind: 'chosen',
              min: 0,
              max: 2,
              effects: [
                {
                  kind: 'each-unit',
                  filter: {
                    inGroup: 'chosen',
                  },
                  bind: 'recipient',
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'recipient',
                      operation: {
                        kind: 'exhaust',
                      },
                    },
                  ],
                },
              ],
            },
            {
              kind: 'choose-mode',
              options: [
                {
                  id: 'return',
                  effects: [
                    {
                      kind: 'select-unit',
                      filter: {
                        nonLeader: true,
                        powerAtMost: 4,
                      },
                      optional: false,
                      bind: 'chosen',
                      effects: [
                        {
                          kind: 'on-unit',
                          target: 'chosen',
                          operation: {
                            kind: 'return-to-hand',
                          },
                        },
                      ],
                    },
                  ],
                },
                {
                  id: 'power',
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
                            kind: 'modify',
                            power: 4,
                            hp: 0,
                            duration: 'phase',
                          },
                        },
                      ],
                    },
                  ],
                },
                {
                  id: 'discard',
                  effects: [
                    {
                      kind: 'discard-random-hand',
                      player: 'enemy',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          id: 'discard',
          effects: [
            {
              kind: 'discard-random-hand',
              player: 'enemy',
            },
            {
              kind: 'choose-mode',
              options: [
                {
                  id: 'return',
                  effects: [
                    {
                      kind: 'select-unit',
                      filter: {
                        nonLeader: true,
                        powerAtMost: 4,
                      },
                      optional: false,
                      bind: 'chosen',
                      effects: [
                        {
                          kind: 'on-unit',
                          target: 'chosen',
                          operation: {
                            kind: 'return-to-hand',
                          },
                        },
                      ],
                    },
                  ],
                },
                {
                  id: 'power',
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
                            kind: 'modify',
                            power: 4,
                            hp: 0,
                            duration: 'phase',
                          },
                        },
                      ],
                    },
                  ],
                },
                {
                  id: 'exhaust',
                  effects: [
                    {
                      kind: 'select-units',
                      filter: {},
                      bind: 'chosen',
                      min: 0,
                      max: 2,
                      effects: [
                        {
                          kind: 'each-unit',
                          filter: {
                            inGroup: 'chosen',
                          },
                          bind: 'recipient',
                          effects: [
                            {
                              kind: 'on-unit',
                              target: 'recipient',
                              operation: {
                                kind: 'exhaust',
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
    },
  ],
} as const satisfies EventDefinition;

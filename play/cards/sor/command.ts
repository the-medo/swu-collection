import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteCommand = {
  cardId: 'command',
  name: 'Command',
  kind: 'event',
  aspects: ['Command', 'Command'],
  traits: ['Innate'],
  cost: 4,
  effects: [
    {
      kind: 'choose-mode',
      options: [
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
                    count: 2,
                  },
                },
              ],
            },
            {
              kind: 'choose-mode',
              options: [
                {
                  id: 'damage',
                  effects: [
                    {
                      kind: 'select-unit',
                      filter: {
                        controller: 'friendly',
                      },
                      optional: false,
                      bind: 'chosen',
                      effects: [
                        {
                          kind: 'select-unit',
                          filter: {
                            controller: 'enemy',
                            unique: false,
                          },
                          optional: false,
                          bind: 'victim',
                          effects: [
                            {
                              kind: 'damage-target',
                              target: 'victim',
                              amount: {
                                kind: 'unit-stat',
                                target: 'chosen',
                                stat: 'power',
                              },
                              source: 'chosen',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
                {
                  id: 'resource',
                  effects: [
                    {
                      kind: 'self-resource',
                      optional: false,
                      ready: false,
                    },
                  ],
                },
                {
                  id: 'return',
                  effects: [
                    {
                      kind: 'inspect-zone',
                      zone: 'discard',
                      player: 'self',
                      chooser: 'owner',
                      filter: {
                        kind: 'unit',
                      },
                      min: 1,
                      max: 1,
                      bind: 'card',
                      effects: [
                        {
                          kind: 'move-card',
                          target: 'card',
                          from: 'discard',
                          to: 'hand',
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
              filter: {
                controller: 'friendly',
              },
              optional: false,
              bind: 'chosen',
              effects: [
                {
                  kind: 'select-unit',
                  filter: {
                    controller: 'enemy',
                    unique: false,
                  },
                  optional: false,
                  bind: 'victim',
                  effects: [
                    {
                      kind: 'damage-target',
                      target: 'victim',
                      amount: {
                        kind: 'unit-stat',
                        target: 'chosen',
                        stat: 'power',
                      },
                      source: 'chosen',
                    },
                  ],
                },
              ],
            },
            {
              kind: 'choose-mode',
              options: [
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
                            count: 2,
                          },
                        },
                      ],
                    },
                  ],
                },
                {
                  id: 'resource',
                  effects: [
                    {
                      kind: 'self-resource',
                      optional: false,
                      ready: false,
                    },
                  ],
                },
                {
                  id: 'return',
                  effects: [
                    {
                      kind: 'inspect-zone',
                      zone: 'discard',
                      player: 'self',
                      chooser: 'owner',
                      filter: {
                        kind: 'unit',
                      },
                      min: 1,
                      max: 1,
                      bind: 'card',
                      effects: [
                        {
                          kind: 'move-card',
                          target: 'card',
                          from: 'discard',
                          to: 'hand',
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
          id: 'resource',
          effects: [
            {
              kind: 'self-resource',
              optional: false,
              ready: false,
            },
            {
              kind: 'choose-mode',
              options: [
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
                            count: 2,
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
                      filter: {
                        controller: 'friendly',
                      },
                      optional: false,
                      bind: 'chosen',
                      effects: [
                        {
                          kind: 'select-unit',
                          filter: {
                            controller: 'enemy',
                            unique: false,
                          },
                          optional: false,
                          bind: 'victim',
                          effects: [
                            {
                              kind: 'damage-target',
                              target: 'victim',
                              amount: {
                                kind: 'unit-stat',
                                target: 'chosen',
                                stat: 'power',
                              },
                              source: 'chosen',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
                {
                  id: 'return',
                  effects: [
                    {
                      kind: 'inspect-zone',
                      zone: 'discard',
                      player: 'self',
                      chooser: 'owner',
                      filter: {
                        kind: 'unit',
                      },
                      min: 1,
                      max: 1,
                      bind: 'card',
                      effects: [
                        {
                          kind: 'move-card',
                          target: 'card',
                          from: 'discard',
                          to: 'hand',
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
          id: 'return',
          effects: [
            {
              kind: 'inspect-zone',
              zone: 'discard',
              player: 'self',
              chooser: 'owner',
              filter: {
                kind: 'unit',
              },
              min: 1,
              max: 1,
              bind: 'card',
              effects: [
                {
                  kind: 'move-card',
                  target: 'card',
                  from: 'discard',
                  to: 'hand',
                },
              ],
            },
            {
              kind: 'choose-mode',
              options: [
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
                            count: 2,
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
                      filter: {
                        controller: 'friendly',
                      },
                      optional: false,
                      bind: 'chosen',
                      effects: [
                        {
                          kind: 'select-unit',
                          filter: {
                            controller: 'enemy',
                            unique: false,
                          },
                          optional: false,
                          bind: 'victim',
                          effects: [
                            {
                              kind: 'damage-target',
                              target: 'victim',
                              amount: {
                                kind: 'unit-stat',
                                target: 'chosen',
                                stat: 'power',
                              },
                              source: 'chosen',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
                {
                  id: 'resource',
                  effects: [
                    {
                      kind: 'self-resource',
                      optional: false,
                      ready: false,
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

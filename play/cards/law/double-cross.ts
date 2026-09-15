import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-interactions.json.
export const doubleCross = {
  cardId: 'double-cross',
  name: 'Double-Cross',
  kind: 'event',
  aspects: ['Command'],
  traits: ['Trick'],
  cost: 6,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        controller: 'friendly',
        nonLeader: true,
      },
      bind: 'first',
      optional: false,
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'enemy',
            nonLeader: true,
          },
          bind: 'second',
          optional: false,
          effects: [
            {
              kind: 'exchange-control',
              first: 'first',
              second: 'second',
              effects: [
                {
                  kind: 'if',
                  condition: {
                    kind: 'numeric-greater',
                    left: {
                      kind: 'card-cost',
                      target: 'first',
                    },
                    right: {
                      kind: 'card-cost',
                      target: 'second',
                    },
                  },
                  effects: [
                    {
                      kind: 'create-credits',
                      amount: {
                        kind: 'difference',
                        left: {
                          kind: 'card-cost',
                          target: 'first',
                        },
                        right: {
                          kind: 'card-cost',
                          target: 'second',
                        },
                      },
                    },
                  ],
                  otherwise: [
                    {
                      kind: 'if',
                      condition: {
                        kind: 'numeric-greater',
                        left: {
                          kind: 'card-cost',
                          target: 'second',
                        },
                        right: {
                          kind: 'card-cost',
                          target: 'first',
                        },
                      },
                      effects: [
                        {
                          kind: 'create-credits',
                          amount: {
                            kind: 'difference',
                            left: {
                              kind: 'card-cost',
                              target: 'second',
                            },
                            right: {
                              kind: 'card-cost',
                              target: 'first',
                            },
                          },
                          player: 'enemy',
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

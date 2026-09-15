import type { LeaderDefinition } from '../definition.ts';

// Official face text and clarifications are pinned in leader-private-choices.json.
export const grandAdmiralThrawnPatientAndInsightful = {
  cardId: 'grand-admiral-thrawn--patient-and-insightful',
  name: 'Grand Admiral Thrawn, Patient and Insightful',
  kind: 'leader',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Imperial', 'Official'],
  unique: true,
  printedCost: 6,
  faces: {
    leader: {
      triggers: [
        {
          id: 'peek',
          timing: 'action-start',
          effects: [
            {
              kind: 'inspect-zone',
              zone: 'deck',
              player: 'self',
              chooser: 'self',
              filter: {},
              min: 0,
              max: 0,
              bind: 'peek',
              effects: [],
              top: 1,
            },
            {
              kind: 'inspect-zone',
              zone: 'deck',
              player: 'enemy',
              chooser: 'self',
              filter: {},
              min: 0,
              max: 0,
              bind: 'peek',
              effects: [],
              top: 1,
            },
          ],
        },
      ],
      actions: [
        {
          id: 'leader-action',
          costs: [
            {
              kind: 'resources',
              amount: 1,
            },
            {
              kind: 'exhaust-self',
            },
          ],
          limit: null,
          effects: [
            {
              kind: 'choose-mode',
              options: [
                {
                  id: 'self-deck',
                  effects: [
                    {
                      kind: 'reveal-top',
                      player: 'self',
                      bind: 'top',
                      effects: [
                        {
                          kind: 'if',
                          condition: {
                            kind: 'card-matches',
                            target: 'top',
                            filter: {},
                          },
                          effects: [
                            {
                              kind: 'select-unit',
                              filter: {
                                maxCost: {
                                  kind: 'card-cost',
                                  target: 'top',
                                },
                              },
                              bind: 'chosen',
                              optional: false,
                              effects: [
                                {
                                  kind: 'on-unit',
                                  target: 'chosen',
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
                {
                  id: 'enemy-deck',
                  effects: [
                    {
                      kind: 'reveal-top',
                      player: 'enemy',
                      bind: 'top',
                      effects: [
                        {
                          kind: 'if',
                          condition: {
                            kind: 'card-matches',
                            target: 'top',
                            filter: {},
                          },
                          effects: [
                            {
                              kind: 'select-unit',
                              filter: {
                                maxCost: {
                                  kind: 'card-cost',
                                  target: 'top',
                                },
                              },
                              bind: 'chosen',
                              optional: false,
                              effects: [
                                {
                                  kind: 'on-unit',
                                  target: 'chosen',
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
        {
          id: 'deploy',
          costs: [],
          limit: 'once-per-game',
          effects: [
            {
              kind: 'deploy',
              condition: {
                kind: 'resources-at-least',
                amount: 6,
              },
              as: 'unit',
            },
          ],
        },
      ],
    },
    unit: {
      power: 3,
      hp: 9,
      arena: 'ground',
      triggers: [
        {
          id: 'peek',
          timing: 'action-start',
          effects: [
            {
              kind: 'inspect-zone',
              zone: 'deck',
              player: 'self',
              chooser: 'self',
              filter: {},
              min: 0,
              max: 0,
              bind: 'peek',
              effects: [],
              top: 1,
            },
            {
              kind: 'inspect-zone',
              zone: 'deck',
              player: 'enemy',
              chooser: 'self',
              filter: {},
              min: 0,
              max: 0,
              bind: 'peek',
              effects: [],
              top: 1,
            },
          ],
        },
        {
          id: 'attack',
          timing: 'attack',
          effects: [
            {
              kind: 'choose-mode',
              options: [
                {
                  id: 'self-deck',
                  effects: [
                    {
                      kind: 'reveal-top',
                      player: 'self',
                      bind: 'top',
                      effects: [
                        {
                          kind: 'if',
                          condition: {
                            kind: 'card-matches',
                            target: 'top',
                            filter: {},
                          },
                          effects: [
                            {
                              kind: 'select-unit',
                              filter: {
                                maxCost: {
                                  kind: 'card-cost',
                                  target: 'top',
                                },
                              },
                              bind: 'chosen',
                              optional: false,
                              effects: [
                                {
                                  kind: 'on-unit',
                                  target: 'chosen',
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
                {
                  id: 'enemy-deck',
                  effects: [
                    {
                      kind: 'reveal-top',
                      player: 'enemy',
                      bind: 'top',
                      effects: [
                        {
                          kind: 'if',
                          condition: {
                            kind: 'card-matches',
                            target: 'top',
                            filter: {},
                          },
                          effects: [
                            {
                              kind: 'select-unit',
                              filter: {
                                maxCost: {
                                  kind: 'card-cost',
                                  target: 'top',
                                },
                              },
                              bind: 'chosen',
                              optional: false,
                              effects: [
                                {
                                  kind: 'on-unit',
                                  target: 'chosen',
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
          optional: true,
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;

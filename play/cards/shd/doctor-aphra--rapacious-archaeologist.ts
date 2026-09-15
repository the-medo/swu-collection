import type { LeaderDefinition } from '../definition.ts';

// Official face text and clarifications are pinned in leader-private-choices.json.
export const doctorAphraRapaciousArchaeologist = {
  cardId: 'doctor-aphra--rapacious-archaeologist',
  name: 'Doctor Aphra, Rapacious Archaeologist',
  kind: 'leader',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Fringe'],
  unique: true,
  printedCost: 5,
  faces: {
    leader: {
      triggers: [
        {
          id: 'observe',
          timing: 'regroup-start',
          effects: [
            {
              kind: 'mill',
              player: 'self',
              count: 1,
              bind: 'milled',
              effects: [],
            },
          ],
        },
      ],
      actions: [
        {
          id: 'deploy',
          costs: [],
          limit: 'once-per-game',
          effects: [
            {
              kind: 'deploy',
              condition: {
                kind: 'resources-at-least',
                amount: 5,
              },
              as: 'unit',
            },
          ],
        },
      ],
    },
    unit: {
      power: 2,
      hp: 5,
      arena: 'ground',
      constant: [
        {
          condition: {
            kind: 'numeric-at-least',
            value: {
              kind: 'zone-size',
              zone: 'discard',
              player: 'self',
              distinctBy: 'cost',
            },
            amount: 5,
          },
          power: 3,
        },
      ],
      triggers: [
        {
          id: 'observe',
          timing: 'deployed',
          effects: [
            {
              kind: 'if',
              condition: {
                kind: 'numeric-at-least',
                value: {
                  kind: 'zone-size',
                  zone: 'discard',
                  player: 'self',
                  distinctBy: 'name',
                },
                amount: 3,
              },
              effects: [
                {
                  kind: 'inspect-zone',
                  zone: 'discard',
                  player: 'self',
                  chooser: 'self',
                  filter: {},
                  min: 1,
                  max: 1,
                  bind: 'first',
                  effects: [
                    {
                      kind: 'inspect-zone',
                      zone: 'discard',
                      player: 'self',
                      chooser: 'self',
                      filter: {
                        differentNameFrom: ['first'],
                      },
                      min: 1,
                      max: 1,
                      bind: 'second',
                      effects: [
                        {
                          kind: 'inspect-zone',
                          zone: 'discard',
                          player: 'self',
                          chooser: 'self',
                          filter: {
                            differentNameFrom: ['first', 'second'],
                          },
                          min: 1,
                          max: 1,
                          bind: 'third',
                          effects: [
                            {
                              kind: 'random-card',
                              targets: ['first', 'second', 'third'],
                              bind: 'returned',
                              effects: [
                                {
                                  kind: 'move-card',
                                  target: 'returned',
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
              ],
            },
          ],
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;

import type { LeaderDefinition } from '../definition.ts';

// Printed faces and clarifications are pinned in leader-history.json.
export const captainPhasmaChromeDome = {
  cardId: 'captain-phasma--chrome-dome',
  name: 'Captain Phasma, Chrome Dome',
  kind: 'leader',
  aspects: ['Aggression', 'Villainy'],
  traits: ['First Order', 'Trooper'],
  unique: true,
  printedCost: 5,
  faces: {
    leader: {
      actions: [
        {
          id: 'leader-action',
          costs: [
            {
              kind: 'exhaust-self',
            },
          ],
          limit: null,
          effects: [
            {
              kind: 'if',
              condition: {
                kind: 'played-card-this-phase',
                filter: {
                  trait: 'First Order',
                },
              },
              effects: [
                {
                  kind: 'select-target',
                  bases: 'any',
                  bind: 'base',
                  optional: false,
                  effects: [
                    {
                      kind: 'damage-target',
                      target: 'base',
                      amount: 1,
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
              as: 'unit',
              condition: {
                kind: 'resources-at-least',
                amount: 5,
              },
            },
          ],
        },
      ],
    },
    unit: {
      power: 4,
      hp: 6,
      arena: 'ground',
      triggers: [
        {
          id: 'attack',
          timing: 'attack',
          effects: [
            {
              kind: 'if',
              condition: {
                kind: 'played-card-this-phase',
                filter: {
                  trait: 'First Order',
                },
                otherThan: 'source',
              },
              effects: [
                {
                  kind: 'select-unit',
                  filter: {},
                  bind: 'chosen',
                  optional: true,
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'chosen',
                      operation: {
                        kind: 'damage',
                        amount: 1,
                      },
                      ifYouDo: [
                        {
                          kind: 'select-target',
                          bases: 'any',
                          bind: 'base',
                          optional: false,
                          effects: [
                            {
                              kind: 'damage-target',
                              target: 'base',
                              amount: 1,
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

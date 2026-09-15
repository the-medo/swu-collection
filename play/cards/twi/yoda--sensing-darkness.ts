import type { LeaderDefinition } from '../definition.ts';

// Official faces and revised timing text are pinned in leader-phase-events.json.
export const yodaSensingDarkness = {
  cardId: 'yoda--sensing-darkness',
  name: 'Yoda, Sensing Darkness',
  kind: 'leader',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Force', 'Jedi', 'Republic'],
  unique: true,
  printedCost: 7,
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
                kind: 'unit-history-at-least',
                event: 'left',
                amount: 1,
                player: 'any',
              },
              effects: [
                {
                  kind: 'draw-cards',
                  amount: 1,
                },
                {
                  kind: 'inspect-zone',
                  zone: 'hand',
                  player: 'self',
                  chooser: 'self',
                  filter: {},
                  min: 1,
                  max: 1,
                  bind: 'hand',
                  effects: [
                    {
                      kind: 'choose-mode',
                      options: [
                        {
                          id: 'deck-top',
                          effects: [
                            {
                              kind: 'move-card',
                              target: 'hand',
                              from: 'hand',
                              to: 'deck-top',
                            },
                          ],
                        },
                        {
                          id: 'deck-bottom',
                          effects: [
                            {
                              kind: 'move-card',
                              target: 'hand',
                              from: 'hand',
                              to: 'deck-bottom',
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
                amount: 7,
              },
              as: 'unit',
            },
          ],
        },
      ],
    },
    unit: {
      power: 4,
      hp: 9,
      arena: 'ground',
      restore: 2,
      triggers: [
        {
          id: 'observe',
          timing: 'deployed',
          effects: [
            {
              kind: 'mill',
              player: 'self',
              count: 1,
              bind: 'discarded',
              effects: [
                {
                  kind: 'select-unit',
                  filter: {
                    controller: 'enemy',
                    nonLeader: true,
                    anyOf: [
                      {
                        costEquals: {
                          kind: 'card-cost',
                          target: 'discarded',
                        },
                      },
                      {
                        costLessThan: {
                          kind: 'card-cost',
                          target: 'discarded',
                        },
                      },
                    ],
                  },
                  bind: 'chosen',
                  optional: false,
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
          optional: true,
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;

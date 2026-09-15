import type { LeaderDefinition } from '../definition.ts';

// Printed roles and official clarifications are pinned in leader-combat.json.
export const grandAdmiralThrawnVictoryIsMine = {
  cardId: 'grand-admiral-thrawn--victory-is-mine',
  name: 'Grand Admiral Thrawn, Victory is Mine',
  kind: 'leader',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Imperial', 'Official'],
  unique: true,
  printedCost: 8,
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
                kind: 'unit-count-comparison',
                relation: 'equal',
              },
              effects: [
                {
                  kind: 'select-unit',
                  filter: {
                    controller: 'friendly',
                  },
                  effects: [
                    {
                      kind: 'attack-bound',
                      target: 'chosen',
                      optional: false,
                      abilities: {
                        restore: 2,
                      },
                    },
                  ],
                  optional: false,
                  bind: 'chosen',
                  forAttack: {},
                },
              ],
              otherwise: [
                {
                  kind: 'select-unit',
                  filter: {
                    controller: 'friendly',
                  },
                  effects: [
                    {
                      kind: 'attack-bound',
                      target: 'chosen',
                      optional: false,
                    },
                  ],
                  optional: false,
                  bind: 'chosen',
                  forAttack: {},
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
                amount: 8,
              },
            },
          ],
        },
      ],
    },
    unit: {
      power: 5,
      hp: 8,
      arena: 'ground',
      restore: 2,
      triggers: [
        {
          id: 'attack',
          timing: 'attack',
          effects: [
            {
              kind: 'if',
              condition: {
                kind: 'unit-count-comparison',
                relation: 'more',
              },
              effects: [
                {
                  kind: 'select-unit',
                  filter: {
                    controller: 'enemy',
                    nonLeader: true,
                  },
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'chosen',
                      operation: {
                        kind: 'defeat',
                      },
                    },
                  ],
                  optional: true,
                  bind: 'chosen',
                },
              ],
            },
          ],
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;

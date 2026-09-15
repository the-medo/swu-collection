import type { LeaderDefinition } from '../definition.ts';

// Printed roles and official clarifications are pinned in leader-combat.json.
export const sawGerreraBringDownTheEmpire = {
  cardId: 'saw-gerrera--bring-down-the-empire',
  name: 'Saw Gerrera, Bring Down the Empire',
  kind: 'leader',
  aspects: ['Command', 'Aggression'],
  traits: ['Rebel'],
  unique: true,
  printedCost: 6,
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
              kind: 'select-unit',
              filter: {
                controller: 'friendly',
              },
              effects: [
                {
                  kind: 'attack-bound',
                  target: 'chosen',
                  optional: false,
                  powerBonus: 2,
                  abilities: {
                    keywords: ['Overwhelm'],
                  },
                  after: [
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
              optional: false,
              bind: 'chosen',
              forAttack: {},
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
                amount: 6,
              },
            },
          ],
        },
      ],
    },
    unit: {
      power: 4,
      hp: 7,
      arena: 'ground',
      triggers: [
        {
          id: 'completed',
          timing: 'attack-ended',
          effects: [
            {
              kind: 'if',
              condition: {
                kind: 'value-at-least',
                name: 'survived',
                amount: 1,
              },
              effects: [
                {
                  kind: 'select-unit',
                  filter: {
                    controller: 'friendly',
                    otherThan: 'source',
                  },
                  effects: [
                    {
                      kind: 'attack-bound',
                      target: 'chosen',
                      optional: false,
                      powerBonus: 2,
                      abilities: {
                        keywords: ['Overwhelm'],
                      },
                      after: [
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
                  optional: true,
                  bind: 'chosen',
                  forAttack: {},
                },
              ],
            },
          ],
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;

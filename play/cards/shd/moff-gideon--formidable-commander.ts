import type { LeaderDefinition } from '../definition.ts';

// Printed roles and official clarifications are pinned in leader-combat.json.
export const moffGideonFormidableCommander = {
  cardId: 'moff-gideon--formidable-commander',
  name: 'Moff Gideon, Formidable Commander',
  kind: 'leader',
  aspects: ['Villainy', 'Command'],
  traits: ['Imperial', 'Official'],
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
              kind: 'select-unit',
              filter: {
                controller: 'friendly',
                maxCost: 3,
              },
              effects: [
                {
                  kind: 'attack-bound',
                  target: 'chosen',
                  optional: false,
                  powerBonus: {
                    kind: 'conditional',
                    condition: {
                      kind: 'unit-matches',
                      target: 'defender',
                      filter: {},
                    },
                    then: 1,
                    otherwise: 0,
                  },
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
                amount: 5,
              },
            },
          ],
        },
      ],
    },
    unit: {
      power: 3,
      hp: 6,
      arena: 'ground',
      keywords: ['Overwhelm'],
      auras: [
        {
          id: 'small-attackers',
          filter: {
            controller: 'friendly',
            maxCost: 3,
            attacking: 'unit',
          },
          power: 1,
          abilities: {
            keywords: ['Overwhelm'],
          },
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;

import type { LeaderDefinition } from '../definition.ts';

// Printed roles and official clarifications are pinned in leader-combat.json.
export const anakinSkywalkerWhatItTakesToWin = {
  cardId: 'anakin-skywalker--what-it-takes-to-win',
  name: 'Anakin Skywalker, What it Takes to Win',
  kind: 'leader',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Force', 'Jedi', 'Republic'],
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
            {
              kind: 'damage-own-base',
              amount: 2,
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
                  powerBonus: {
                    kind: 'conditional',
                    condition: {
                      kind: 'unit-matches',
                      target: 'defender',
                      filter: {},
                    },
                    then: 2,
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
      keywords: ['Overwhelm'],
      constant: [
        {
          condition: {
            kind: 'always',
          },
          power: {
            kind: 'own-base-damage',
            divisor: 5,
          },
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;

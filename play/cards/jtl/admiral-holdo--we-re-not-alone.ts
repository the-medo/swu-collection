import type { LeaderDefinition } from '../definition.ts';

// Printed roles and official clarifications are pinned in leader-combat.json.
export const admiralHoldoWeReNotAlone = {
  cardId: 'admiral-holdo--we-re-not-alone',
  name: "Admiral Holdo, We're Not Alone",
  kind: 'leader',
  aspects: ['Command', 'Heroism'],
  traits: ['Resistance', 'Official'],
  unique: true,
  printedCost: 6,
  faces: {
    leader: {
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
              kind: 'select-unit',
              filter: {
                anyOf: [
                  {
                    trait: 'Resistance',
                  },
                  {
                    upgradeTrait: 'Resistance',
                  },
                ],
              },
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'modify',
                    power: 2,
                    hp: 2,
                    duration: 'phase',
                  },
                },
              ],
              optional: false,
              bind: 'chosen',
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
      power: 3,
      hp: 8,
      arena: 'ground',
      triggers: [
        {
          id: 'attack',
          timing: 'attack',
          effects: [
            {
              kind: 'select-unit',
              filter: {
                anyOf: [
                  {
                    trait: 'Resistance',
                  },
                  {
                    upgradeTrait: 'Resistance',
                  },
                ],
                otherThan: 'source',
              },
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'modify',
                    power: 2,
                    hp: 2,
                    duration: 'phase',
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
  },
} as const satisfies LeaderDefinition;

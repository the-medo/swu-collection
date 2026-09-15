import type { LeaderDefinition } from '../definition.ts';

// Printed faces and official clarifications are pinned in leader-costs-damage.json.
export const hanSoloIGotAReallyGoodFeeling = {
  cardId: 'han-solo--i-got-a-really-good-feeling',
  name: 'Han Solo, I Got a Really Good Feeling',
  kind: 'leader',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Underworld'],
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
            {
              kind: 'defeat-friendly-token',
            },
          ],
          limit: null,
          effects: [
            {
              kind: 'select-target',
              bind: 'target',
              optional: false,
              effects: [
                {
                  kind: 'damage-target',
                  target: 'target',
                  amount: 1,
                },
              ],
              units: {},
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
                amount: 5,
              },
              as: 'unit',
            },
          ],
        },
      ],
    },
    unit: {
      power: 4,
      hp: 5,
      arena: 'ground',
      keywords: ['Saboteur'],
      triggers: [
        {
          id: 'observe',
          timing: 'attack',
          effects: [
            {
              kind: 'defeat-tokens',
              countAs: 'tokens',
              effects: [
                {
                  kind: 'select-target',
                  bind: 'target',
                  optional: false,
                  effects: [
                    {
                      kind: 'damage-target',
                      target: 'target',
                      amount: {
                        kind: 'value',
                        name: 'tokens',
                      },
                    },
                  ],
                  units: {},
                },
              ],
            },
          ],
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;

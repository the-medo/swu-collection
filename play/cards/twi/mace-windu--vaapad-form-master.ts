import type { LeaderDefinition } from '../definition.ts';

// Printed faces and clarifications are pinned in leader-history.json.
export const maceWinduVaapadFormMaster = {
  cardId: 'mace-windu--vaapad-form-master',
  name: 'Mace Windu, Vaapad Form Master',
  kind: 'leader',
  aspects: ['Aggression', 'Heroism'],
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
                controller: 'enemy',
                damaged: true,
              },
              bind: 'chosen',
              optional: false,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'damage',
                    amount: 1,
                  },
                },
                {
                  kind: 'if',
                  condition: {
                    kind: 'unit-matches',
                    target: 'chosen',
                    filter: {
                      damageAtLeast: 5,
                    },
                  },
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'chosen',
                      operation: {
                        kind: 'damage',
                        amount: 1,
                      },
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
                amount: 7,
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
      triggers: [
        {
          id: 'deployed',
          timing: 'deployed',
          effects: [
            {
              kind: 'damage-units',
              amount: 2,
              filter: {
                controller: 'enemy',
                damaged: true,
              },
            },
          ],
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;

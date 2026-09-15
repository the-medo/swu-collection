import type { LeaderDefinition } from '../definition.ts';

// Printed faces and clarifications are pinned in leader-history.json.
export const leiaOrganaGetToYourTransports = {
  cardId: 'leia-organa--get-to-your-transports-',
  name: 'Leia Organa, Get to Your Transports!',
  kind: 'leader',
  aspects: ['Command', 'Heroism'],
  traits: ['Rebel', 'Official'],
  unique: true,
  printedCost: 5,
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
                controller: 'friendly',
              },
              bind: 'chosen',
              optional: false,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'heal',
                    amount: 1,
                  },
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
      power: 3,
      hp: 7,
      arena: 'ground',
      triggers: [
        {
          id: 'attack',
          timing: 'attack',
          effects: [
            {
              kind: 'select-unit',
              filter: {
                controller: 'friendly',
              },
              bind: 'first',
              optional: false,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'first',
                  operation: {
                    kind: 'heal',
                    amount: 1,
                  },
                },
                {
                  kind: 'select-unit',
                  filter: {
                    controller: 'friendly',
                    otherThan: 'first',
                  },
                  bind: 'second',
                  optional: false,
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'second',
                      operation: {
                        kind: 'heal',
                        amount: 1,
                      },
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

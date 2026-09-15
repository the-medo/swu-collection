import type { LeaderDefinition } from '../definition.ts';

// Printed faces and revised official text are pinned in leader-reactions.json.
export const quinlanVosStickingTheLanding = {
  cardId: 'quinlan-vos--sticking-the-landing',
  name: 'Quinlan Vos, Sticking the Landing',
  kind: 'leader',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Force', 'Jedi', 'Republic'],
  unique: true,
  printedCost: 5,
  faces: {
    leader: {
      triggers: [
        {
          id: 'observe',
          timing: 'friendly-played',
          effects: [
            {
              kind: 'pay',
              costs: [
                {
                  kind: 'exhaust-self',
                },
              ],
              optional: true,
              effects: [
                {
                  kind: 'select-unit',
                  filter: {
                    controller: 'enemy',
                    costEquals: {
                      kind: 'card-cost',
                      target: 'subject',
                    },
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
                  ],
                },
              ],
            },
          ],
        },
      ],
      actions: [
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
      power: 3,
      hp: 7,
      arena: 'ground',
      triggers: [
        {
          id: 'observe',
          timing: 'friendly-played',
          effects: [
            {
              kind: 'select-unit',
              filter: {
                controller: 'enemy',
                maxCost: {
                  kind: 'card-cost',
                  target: 'subject',
                },
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
              ],
            },
          ],
          optional: true,
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;

import type { LeaderDefinition } from '../definition.ts';

// Printed faces and official clarifications are pinned in leader-costs-damage.json.
export const rexNoOtherOption = {
  cardId: 'rex--no-other-option',
  name: 'Rex, No Other Option',
  kind: 'leader',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Clone', 'Trooper'],
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
              kind: 'ready-enemy-unit',
            },
          ],
          limit: null,
          effects: [
            {
              kind: 'next-play',
              filter: {
                kind: 'event',
              },
              discount: 1,
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
                amount: 6,
              },
              as: 'unit',
            },
          ],
        },
      ],
    },
    unit: {
      power: 5,
      hp: 6,
      arena: 'ground',
      triggers: [
        {
          id: 'observe',
          timing: 'attack',
          effects: [
            {
              kind: 'select-unit',
              filter: {
                controller: 'enemy',
                exhausted: true,
              },
              bind: 'chosen',
              optional: true,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'ready',
                  },
                  ifYouDo: [
                    {
                      kind: 'next-play',
                      filter: {
                        kind: 'event',
                      },
                      discount: 2,
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

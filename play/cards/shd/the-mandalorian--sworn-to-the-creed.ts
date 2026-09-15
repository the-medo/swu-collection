import type { LeaderDefinition } from '../definition.ts';

// Printed faces and revised official text are pinned in leader-reactions.json.
export const theMandalorianSwornToTheCreed = {
  cardId: 'the-mandalorian--sworn-to-the-creed',
  name: 'The Mandalorian, Sworn To The Creed',
  kind: 'leader',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Mandalorian', 'Bounty Hunter'],
  unique: true,
  printedCost: 6,
  faces: {
    leader: {
      triggers: [
        {
          id: 'observe',
          timing: 'friendly-card-played',
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
                    remainingHpAtMost: 4,
                  },
                  bind: 'chosen',
                  optional: false,
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'chosen',
                      operation: {
                        kind: 'exhaust',
                      },
                    },
                  ],
                },
              ],
            },
          ],
          condition: {
            kind: 'card-role',
            target: 'subject',
            role: 'upgrade',
          },
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
                amount: 6,
              },
              as: 'unit',
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
          id: 'observe',
          timing: 'friendly-card-played',
          effects: [
            {
              kind: 'select-unit',
              filter: {
                controller: 'enemy',
                remainingHpAtMost: 6,
              },
              bind: 'chosen',
              optional: false,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'exhaust',
                  },
                },
              ],
            },
          ],
          condition: {
            kind: 'card-role',
            target: 'subject',
            role: 'upgrade',
          },
          optional: true,
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;

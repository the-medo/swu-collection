import type { LeaderDefinition } from '../definition.ts';

// Printed faces and revised official text are pinned in leader-reactions.json.
export const cadBaneHeWhoNeedsNoIntroduction = {
  cardId: 'cad-bane--he-who-needs-no-introduction',
  name: 'Cad Bane, He Who Needs No Introduction',
  kind: 'leader',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Underworld', 'Bounty Hunter'],
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
                  chooser: 'enemy',
                },
              ],
            },
          ],
          condition: {
            kind: 'card-matches',
            target: 'subject',
            filter: {
              trait: 'Underworld',
            },
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
      power: 2,
      hp: 8,
      arena: 'ground',
      raid: 2,
      triggers: [
        {
          id: 'observe',
          timing: 'friendly-card-played',
          effects: [
            {
              kind: 'select-unit',
              filter: {
                controller: 'enemy',
              },
              bind: 'chosen',
              optional: false,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'damage',
                    amount: 2,
                  },
                },
              ],
              chooser: 'enemy',
            },
          ],
          condition: {
            kind: 'card-matches',
            target: 'subject',
            filter: {
              trait: 'Underworld',
            },
          },
          optional: true,
          limit: 'once-per-round',
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;

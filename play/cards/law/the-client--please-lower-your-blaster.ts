import type { LeaderDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 phase history and tokens fixture.
export const theClientPleaseLowerYourBlaster = {
  cardId: 'the-client--please-lower-your-blaster',
  name: 'The Client, Please Lower Your Blaster',
  kind: 'leader',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Imperial', 'Official'],
  unique: true,
  printedCost: 5,
  faces: {
    leader: {
      actions: [
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
        {
          id: 'exhaust-after-token',
          costs: [
            {
              kind: 'exhaust-self',
            },
          ],
          limit: null,
          effects: [
            {
              kind: 'if',
              condition: {
                kind: 'phase-event',
                event: 'token-created',
              },
              effects: [
                {
                  kind: 'select-unit',
                  filter: {
                    controller: 'enemy',
                  },
                  optional: false,
                  bind: 'chosen',
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
        },
      ],
    },
    unit: {
      power: 4,
      hp: 4,
      arena: 'ground',
      keywords: ['Shielded'],
      triggers: [
        {
          id: 'token-exhaust',
          timing: 'attack',
          effects: [
            {
              kind: 'if',
              condition: {
                kind: 'phase-event',
                event: 'token-created',
              },
              effects: [
                {
                  kind: 'select-unit',
                  filter: {
                    controller: 'enemy',
                  },
                  optional: false,
                  bind: 'chosen',
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
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;

import type { LeaderDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 observer fixture.
export const ezraBridgerItSNowOrNever = {
  cardId: 'ezra-bridger--it-s-now-or-never',
  name: "Ezra Bridger, It's Now or Never",
  kind: 'leader',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Force', 'Jedi', 'Rebel', 'Spectre'],
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
      ],
      triggers: [
        {
          id: 'combat-advantage',
          timing: 'friendly-attack-ended',
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
                    otherThan: 'subject',
                  },
                  optional: false,
                  bind: 'chosen',
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'chosen',
                      operation: {
                        kind: 'give-token',
                        token: 'advantage',
                        count: 1,
                      },
                    },
                  ],
                },
              ],
            },
          ],
          condition: {
            kind: 'value-at-least',
            name: 'combat-base-damage',
            amount: 3,
          },
        },
      ],
    },
    unit: {
      power: 3,
      hp: 6,
      arena: 'ground',
      keywords: ['Saboteur'],
      triggers: [
        {
          id: 'combat-advantage',
          timing: 'friendly-attack-ended',
          effects: [
            {
              kind: 'select-unit',
              filter: {
                otherThan: 'subject',
              },
              optional: true,
              bind: 'chosen',
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'give-token',
                    token: 'advantage',
                    count: 1,
                  },
                },
              ],
            },
          ],
          condition: {
            kind: 'value-at-least',
            name: 'combat-base-damage',
            amount: 3,
          },
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;

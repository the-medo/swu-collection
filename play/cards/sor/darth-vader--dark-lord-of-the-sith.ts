import type { LeaderDefinition } from '../definition.ts';

// Printed faces and clarifications are pinned in leader-history.json.
export const darthVaderDarkLordOfTheSith = {
  cardId: 'darth-vader--dark-lord-of-the-sith',
  name: 'Darth Vader, Dark Lord of the Sith',
  kind: 'leader',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Force', 'Imperial', 'Sith'],
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
              kind: 'if',
              condition: {
                kind: 'played-card-this-phase',
                filter: {
                  aspect: 'Villainy',
                },
              },
              effects: [
                {
                  kind: 'select-unit',
                  filter: {},
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
                {
                  kind: 'select-target',
                  bases: 'any',
                  bind: 'base',
                  optional: false,
                  effects: [
                    {
                      kind: 'damage-target',
                      target: 'base',
                      amount: 1,
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
          id: 'attack',
          timing: 'attack',
          effects: [
            {
              kind: 'select-unit',
              filter: {},
              bind: 'chosen',
              optional: true,
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
            },
          ],
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;

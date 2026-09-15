import type { LeaderDefinition } from '../definition.ts';

// Both printed faces are pinned in leader-foundations.json.
export const kitFistoFocusedJediMaster = {
  cardId: 'kit-fisto--focused-jedi-master',
  name: 'Kit Fisto, Focused Jedi Master',
  kind: 'leader',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Force', 'Jedi', 'Republic'],
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
              kind: 'if',
              condition: {
                kind: 'attacked-with-trait',
                trait: 'Jedi',
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
                        amount: 2,
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
                amount: 5,
              },
            },
          ],
        },
      ],
    },
    unit: {
      power: 1,
      hp: 6,
      arena: 'ground',
      keywords: ['Saboteur'],
      constant: [
        {
          condition: {
            kind: 'always',
          },
          power: {
            kind: 'unit-count',
            filter: {
              controller: 'friendly',
              otherThan: 'source',
              trait: 'Jedi',
            },
          },
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;

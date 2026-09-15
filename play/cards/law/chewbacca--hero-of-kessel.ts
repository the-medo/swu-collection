import type { LeaderDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 ability costs fixture.
export const chewbaccaHeroOfKessel = {
  cardId: 'chewbacca--hero-of-kessel',
  name: 'Chewbacca, Hero of Kessel',
  kind: 'leader',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Underworld', 'Wookiee'],
  unique: true,
  printedCost: 4,
  faces: {
    leader: {
      actions: [
        {
          id: 'deploy',
          costs: [
            {
              kind: 'resources',
              amount: 4,
            },
          ],
          limit: 'once-per-game',
          effects: [
            {
              kind: 'deploy',
              as: 'unit',
              condition: null,
            },
          ],
        },
        {
          id: 'break-free',
          costs: [
            {
              kind: 'resources',
              amount: 1,
            },
            {
              kind: 'exhaust-self',
            },
            {
              kind: 'defeat-resource',
            },
          ],
          limit: null,
          effects: [
            {
              kind: 'select-unit',
              filter: {},
              optional: false,
              bind: 'chosen',
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
            {
              kind: 'create-credits',
              amount: 1,
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
          id: 'resource-shot',
          timing: 'attack',
          effects: [
            {
              kind: 'pay',
              costs: [
                {
                  kind: 'defeat-resource',
                },
              ],
              optional: true,
              effects: [
                {
                  kind: 'select-unit',
                  filter: {},
                  optional: false,
                  bind: 'chosen',
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
                {
                  kind: 'create-credits',
                  amount: 1,
                },
              ],
            },
          ],
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;

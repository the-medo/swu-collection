import type { UnitDefinition } from '../definition.ts';

// LAW 214. Printed text is pinned in meta-board fixture.
export const bobaFettForAPrice = {
  cardId: 'boba-fett--for-a-price',
  name: 'Boba Fett, For a Price',
  kind: 'unit',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Underworld', 'Bounty Hunter'],
  unique: true,
  cost: 5,
  power: 6,
  hp: 5,
  arena: 'ground',
  triggers: [
    {
      id: 'on-played',
      timing: 'played',
      effects: [
        {
          kind: 'pay',
          costs: [
            {
              kind: 'resources',
              amount: 1,
            },
          ],
          optional: true,
          effects: [
            {
              kind: 'select-unit',
              bind: 'chosen',
              filter: {
                arena: 'ground',
              },
              optional: false,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'damage',
                    amount: 3,
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'on-attack',
      timing: 'attack',
      effects: [
        {
          kind: 'pay',
          costs: [
            {
              kind: 'resources',
              amount: 1,
            },
          ],
          optional: true,
          effects: [
            {
              kind: 'select-unit',
              bind: 'chosen',
              filter: {
                arena: 'ground',
              },
              optional: false,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'damage',
                    amount: 3,
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;

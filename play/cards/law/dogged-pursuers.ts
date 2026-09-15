import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 token/effect fixture.
export const doggedPursuers = {
  cardId: 'dogged-pursuers',
  name: 'Dogged Pursuers',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Underworld', 'Bounty Hunter'],
  cost: 5,
  power: 5,
  hp: 5,
  arena: 'ground',
  triggers: [
    {
      id: 'paid-damage',
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
              kind: 'damage-unit',
              amount: 2,
              arena: 'ground',
              optional: false,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;

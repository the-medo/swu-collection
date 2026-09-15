import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 token/effect fixture.
export const getawayFreighter = {
  cardId: 'getaway-freighter',
  name: 'Getaway Freighter',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Vehicle', 'Transport'],
  cost: 3,
  power: 1,
  hp: 4,
  arena: 'space',
  triggers: [
    {
      id: 'attack-credit',
      timing: 'attack',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'units-at-least',
            filter: {
              controller: 'friendly',
              arena: 'ground',
            },
            amount: 1,
          },
          effects: [
            {
              kind: 'create-credits',
              amount: 1,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;

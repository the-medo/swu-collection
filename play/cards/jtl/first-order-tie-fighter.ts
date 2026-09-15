import type { UnitDefinition } from '../definition.ts';

// JTL 081. Printed text is pinned in meta-board fixture.
export const firstOrderTieFighter = {
  cardId: 'first-order-tie-fighter',
  name: 'First Order TIE Fighter',
  kind: 'unit',
  aspects: ['Command', 'Villainy'],
  traits: ['First Order', 'Vehicle', 'Fighter'],
  cost: 1,
  power: 2,
  hp: 1,
  arena: 'space',
  constant: [
    {
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'friendly',
          token: true,
        },
        amount: 1,
      },
      abilities: {
        raid: 1,
      },
    },
  ],
} as const satisfies UnitDefinition;

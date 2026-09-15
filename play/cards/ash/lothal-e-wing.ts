import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 conditional ability fixture.
export const lothalEWing = {
  cardId: 'lothal-e-wing',
  name: 'Lothal E-Wing',
  kind: 'unit',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['New Republic', 'Vehicle', 'Fighter'],
  cost: 2,
  power: 2,
  hp: 3,
  arena: 'space',
  constant: [
    {
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'enemy',
          upgraded: true,
        },
        amount: 1,
      },
      abilities: {
        restore: 2,
      },
    },
  ],
} as const satisfies UnitDefinition;

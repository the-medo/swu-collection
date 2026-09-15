import type { UnitDefinition } from '../definition.ts';

// ASH 078. Printed text is pinned in meta-board fixture.
export const bWingRearguard = {
  cardId: 'b-wing-rearguard',
  name: 'B-Wing Rearguard',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Rebel', 'Vehicle', 'Fighter'],
  cost: 4,
  power: 3,
  hp: 5,
  arena: 'space',
  constant: [
    {
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'friendly',
          arena: 'ground',
        },
        amount: 1,
      },
      abilities: {
        keywords: ['Sentinel'],
      },
    },
  ],
} as const satisfies UnitDefinition;

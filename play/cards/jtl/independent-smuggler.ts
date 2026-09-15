import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 foundation fixture.
export const independentSmuggler = {
  cardId: 'independent-smuggler',
  name: 'Independent Smuggler',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Underworld', 'Pilot'],
  cost: 1,
  power: 1,
  hp: 1,
  arena: 'ground',
  raid: 1,
  piloting: [
    {
      id: 'piloting',
      cost: 1,
      aspects: ['Cunning'],
    },
  ],
  upgrade: {
    modifiers: {
      power: 1,
      hp: 1,
    },
    attachTo: 'friendly-vehicle-without-pilot',
    grants: {
      raid: 1,
    },
  },
} as const satisfies UnitDefinition;

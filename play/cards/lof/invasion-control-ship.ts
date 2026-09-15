import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 token/effect fixture.
export const invasionControlShip = {
  cardId: 'invasion-control-ship',
  name: 'Invasion Control Ship',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Separatist', 'Vehicle', 'Capital Ship'],
  cost: 7,
  power: 5,
  hp: 9,
  arena: 'space',
  auras: [
    {
      id: 'droid-raid',
      filter: {
        controller: 'friendly',
        trait: 'Droid',
      },
      abilities: {
        raid: 2,
      },
    },
  ],
} as const satisfies UnitDefinition;

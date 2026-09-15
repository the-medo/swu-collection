import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 foundation fixture.
export const heraSyndullaWeVeLostEnough = {
  cardId: 'hera-syndulla--we-ve-lost-enough',
  name: "Hera Syndulla, We've Lost Enough",
  kind: 'unit',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Rebel', "Twi'lek", 'Spectre', 'Pilot'],
  unique: true,
  cost: 2,
  power: 2,
  hp: 3,
  arena: 'ground',
  restore: 1,
  piloting: [
    {
      id: 'piloting',
      cost: 2,
      aspects: ['Vigilance', 'Heroism'],
    },
  ],
  upgrade: {
    modifiers: {
      power: 2,
      hp: 3,
    },
    attachTo: 'friendly-vehicle-without-pilot',
    grants: {
      restore: 1,
    },
  },
} as const satisfies UnitDefinition;

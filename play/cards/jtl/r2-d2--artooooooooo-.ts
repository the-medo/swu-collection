import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 Pilot foundations fixture.
export const r2D2Artooooooooo = {
  cardId: 'r2-d2--artooooooooo-',
  name: 'R2-D2, Artooooooooo!',
  kind: 'unit',
  aspects: ['Heroism'],
  traits: ['Rebel', 'Droid', 'Pilot'],
  unique: true,
  cost: 1,
  power: 1,
  hp: 4,
  arena: 'ground',
  piloting: [
    {
      id: 'pilot',
      cost: 0,
      aspects: ['Heroism'],
    },
  ],
  upgrade: {
    modifiers: {
      power: 1,
      hp: 1,
    },
    attachTo: 'friendly-vehicle-without-pilot',
    ignorePilotLimit: true,
    grants: {
      extraPilotSlots: 1,
    },
  },
} as const satisfies UnitDefinition;

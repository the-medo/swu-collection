import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-defeats.json.
export const l337GetOutOfMySeat = {
  cardId: 'l3-37--get-out-of-my-seat',
  name: 'L3-37, Get Out Of My Seat',
  kind: 'unit',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Underworld', 'Droid', 'Pilot'],
  unique: true,
  cost: 3,
  power: 3,
  hp: 3,
  arena: 'ground',
  defeatToUpgrade: true,
  piloting: [
    {
      id: 'piloting',
      cost: 3,
      aspects: ['Vigilance', 'Heroism'],
    },
  ],
  upgrade: {
    modifiers: {
      power: 3,
      hp: 3,
    },
    attachTo: 'friendly-vehicle-without-pilot',
  },
} as const satisfies UnitDefinition;

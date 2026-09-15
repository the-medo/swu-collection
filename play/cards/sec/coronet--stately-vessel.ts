import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-foundations.json.
export const coronetStatelyVessel = {
  cardId: 'coronet--stately-vessel',
  name: 'Coronet, Stately Vessel',
  kind: 'unit',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Mandalorian', 'Vehicle', 'Transport'],
  unique: true,
  cost: 5,
  power: 4,
  hp: 6,
  arena: 'space',
  restore: 1,
  auras: [
    {
      id: 'escort-restore',
      filter: {
        controller: 'friendly',
        otherThan: 'source',
      },
      abilities: {
        restore: 1,
      },
    },
  ],
} as const satisfies UnitDefinition;

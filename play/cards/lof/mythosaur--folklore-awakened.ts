import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-attributes.json.
export const mythosaurFolkloreAwakened = {
  cardId: 'mythosaur--folklore-awakened',
  name: 'Mythosaur, Folklore Awakened',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Mandalorian', 'Creature'],
  unique: true,
  cost: 9,
  power: 10,
  hp: 10,
  arena: 'ground',
  keywords: ['Shielded'],
  unitProtection: [
    {
      filter: { controller: 'friendly', upgraded: true },
      operations: ['exhaust', 'return-to-hand'],
    },
  ],
  traitGrants: [
    {
      leader: true,
      trait: 'Mandalorian',
    },
  ],
} as const satisfies UnitDefinition;

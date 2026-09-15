import type { UnitDefinition } from '../definition.ts';

// LOF 231. Printed text is pinned in meta-force-indirect fixture.
export const darthTyranusServantOfSidious = {
  cardId: 'darth-tyranus--servant-of-sidious',
  name: 'Darth Tyranus, Servant of Sidious',
  kind: 'unit',
  aspects: ['Villainy'],
  traits: ['Force', 'Separatist', 'Sith'],
  unique: true,
  cost: 4,
  power: 4,
  hp: 3,
  arena: 'ground',
  keywords: ['Shielded'],
  constant: [
    {
      condition: {
        kind: 'force-with-you',
      },
      abilities: {
        keywords: ['Ambush'],
      },
    },
  ],
} as const satisfies UnitDefinition;

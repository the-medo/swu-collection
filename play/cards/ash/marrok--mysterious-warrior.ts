import type { UnitDefinition } from '../definition.ts';

// ASH 030. Printed text is pinned in the meta token fixture.
export const marrokMysteriousWarrior = {
  cardId: 'marrok--mysterious-warrior',
  name: 'Marrok, Mysterious Warrior',
  kind: 'unit',
  aspects: ['Vigilance', 'Aggression', 'Villainy'],
  traits: ['Force', 'Inquisitor'],
  unique: true,
  cost: 3,
  power: 2,
  hp: 6,
  arena: 'ground',
  keywords: ['Sentinel'],
  constant: [
    {
      condition: {
        kind: 'unit-matches',
        target: 'source',
        filter: {
          upgraded: true,
        },
      },
      abilities: {
        keywords: ['Saboteur'],
      },
      losesKeywords: ['Sentinel'],
    },
  ],
} as const satisfies UnitDefinition;

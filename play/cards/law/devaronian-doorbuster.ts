import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 foundation fixture.
export const devaronianDoorbuster = {
  cardId: 'devaronian-doorbuster',
  name: 'Devaronian Doorbuster',
  kind: 'unit',
  aspects: ['Command', 'Cunning'],
  traits: ['Underworld'],
  cost: 2,
  power: 3,
  hp: 2,
  arena: 'ground',
  keywords: ['Saboteur'],
  restore: 1,
} as const satisfies UnitDefinition;

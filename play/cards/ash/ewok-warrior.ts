import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 foundation fixture.
export const ewokWarrior = {
  cardId: 'ewok-warrior',
  name: 'Ewok Warrior',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Ewok'],
  cost: 2,
  power: 3,
  hp: 2,
  arena: 'ground',
  keywords: ['Hidden'],
} as const satisfies UnitDefinition;

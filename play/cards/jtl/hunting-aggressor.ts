import type { UnitDefinition } from '../definition.ts';

// JTL 165. Printed text is pinned in meta-force-indirect fixture.
export const huntingAggressor = {
  cardId: 'hunting-aggressor',
  name: 'Hunting Aggressor',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Underworld', 'Vehicle', 'Transport'],
  cost: 4,
  power: 3,
  hp: 6,
  arena: 'space',
  indirectBonus: 1,
} as const satisfies UnitDefinition;

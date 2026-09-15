import type { UnitDefinition } from '../definition.ts';

// LOF 61. Printed text is pinned in the meta foundation fixture.
export const secretiveSage = {
  cardId: 'secretive-sage',
  name: 'Secretive Sage',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Force', 'Fringe'],
  cost: 2,
  power: 2,
  hp: 2,
  arena: 'ground',
  keywords: ['Shielded'],
} as const satisfies UnitDefinition;

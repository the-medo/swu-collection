import type { UnitDefinition } from '../definition.ts';

// JTL 184. Printed text is pinned in the meta foundation fixture.
export const contractedJumpmaster = {
  cardId: 'contracted-jumpmaster',
  name: 'Contracted Jumpmaster',
  kind: 'unit',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Underworld', 'Vehicle', 'Transport'],
  cost: 3,
  power: 2,
  hp: 4,
  arena: 'space',
  keywords: ['Sentinel'],
} as const satisfies UnitDefinition;

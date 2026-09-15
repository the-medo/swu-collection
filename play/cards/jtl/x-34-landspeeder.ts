import type { UnitDefinition } from '../definition.ts';

// JTL 214. Printed text is pinned in the meta foundation fixture.
export const x34Landspeeder = {
  cardId: 'x-34-landspeeder',
  name: 'X-34 Landspeeder',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Fringe', 'Vehicle', 'Speeder'],
  cost: 2,
  power: 2,
  hp: 3,
  arena: 'ground',
  keywords: ['Ambush'],
} as const satisfies UnitDefinition;

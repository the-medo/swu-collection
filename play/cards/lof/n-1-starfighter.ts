import type { UnitDefinition } from '../definition.ts';

// LOF 192. Printed text is pinned in the meta foundation fixture.
export const n1Starfighter = {
  cardId: 'n-1-starfighter',
  name: 'N-1 Starfighter',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Naboo', 'Vehicle', 'Fighter'],
  cost: 2,
  power: 3,
  hp: 2,
  arena: 'space',
} as const satisfies UnitDefinition;

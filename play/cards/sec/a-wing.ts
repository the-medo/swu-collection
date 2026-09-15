import type { UnitDefinition } from '../definition.ts';

// SEC 213. Printed text is pinned in the meta foundation fixture.
export const aWing = {
  cardId: 'a-wing',
  name: 'A-Wing',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Vehicle', 'Fighter'],
  cost: 1,
  power: 1,
  hp: 2,
  arena: 'space',
  raid: 1,
} as const satisfies UnitDefinition;

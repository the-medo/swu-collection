import type { UnitDefinition } from '../definition.ts';

// SEC 001. Printed text is pinned in the meta token fixture.
export const spy = {
  cardId: 'spy',
  name: 'Spy',
  kind: 'unit',
  aspects: [],
  traits: ['Official'],
  cost: 0,
  power: 0,
  hp: 2,
  arena: 'ground',
  token: true,
  raid: 2,
} as const satisfies UnitDefinition;

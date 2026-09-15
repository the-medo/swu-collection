import type { UnitDefinition } from '../definition.ts';

// JTL 002. Printed text is pinned in the meta token fixture.
export const xWing = {
  cardId: 'x-wing',
  name: 'X-Wing',
  kind: 'unit',
  aspects: ['Heroism'],
  traits: ['Vehicle', 'Fighter'],
  cost: 0,
  power: 2,
  hp: 2,
  arena: 'space',
  token: true,
} as const satisfies UnitDefinition;

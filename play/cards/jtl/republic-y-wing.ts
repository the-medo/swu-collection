import type { UnitDefinition } from '../definition.ts';

// JTL 212. Printed text is pinned in the meta foundation fixture.
export const republicYWing = {
  cardId: 'republic-y-wing',
  name: 'Republic Y-Wing',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Republic', 'Vehicle', 'Fighter'],
  cost: 1,
  power: 1,
  hp: 3,
  arena: 'space',
} as const satisfies UnitDefinition;

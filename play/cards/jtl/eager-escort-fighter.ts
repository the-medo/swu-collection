import type { UnitDefinition } from '../definition.ts';

// JTL 112. Printed text is pinned in the meta foundation fixture.
export const eagerEscortFighter = {
  cardId: 'eager-escort-fighter',
  name: 'Eager Escort Fighter',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['New Republic', 'Vehicle', 'Fighter'],
  cost: 3,
  power: 4,
  hp: 1,
  arena: 'space',
  keywords: ['Ambush'],
} as const satisfies UnitDefinition;

import type { UnitDefinition } from '../definition.ts';

// JTL 95. Printed text is pinned in the meta foundation fixture.
export const phoenixSquadronAWing = {
  cardId: 'phoenix-squadron-a-wing',
  name: 'Phoenix Squadron A-Wing',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Rebel', 'Vehicle', 'Fighter'],
  cost: 2,
  power: 3,
  hp: 2,
  arena: 'space',
} as const satisfies UnitDefinition;

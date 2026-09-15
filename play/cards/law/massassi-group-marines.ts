import type { UnitDefinition } from '../definition.ts';

// LAW 146. Printed text is pinned in the meta foundation fixture.
export const massassiGroupMarines = {
  cardId: 'massassi-group-marines',
  name: 'Massassi Group Marines',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Rebel', 'Trooper'],
  cost: 3,
  power: 4,
  hp: 4,
  arena: 'ground',
} as const satisfies UnitDefinition;

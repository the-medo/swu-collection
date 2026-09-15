import type { UnitDefinition } from '../definition.ts';

// LAW 211. Printed text is pinned in the meta foundation fixture.
export const blackSunPatroller = {
  cardId: 'black-sun-patroller',
  name: 'Black Sun Patroller',
  kind: 'unit',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Underworld', 'Vehicle', 'Fighter'],
  cost: 2,
  power: 2,
  hp: 2,
  arena: 'space',
  keywords: ['Shielded'],
} as const satisfies UnitDefinition;

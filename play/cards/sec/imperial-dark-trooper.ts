import type { UnitDefinition } from '../definition.ts';

// SEC 80. Printed text is pinned in the meta foundation fixture.
export const imperialDarkTrooper = {
  cardId: 'imperial-dark-trooper',
  name: 'Imperial Dark Trooper',
  kind: 'unit',
  aspects: ['Command', 'Villainy'],
  traits: ['Imperial', 'Droid', 'Trooper'],
  cost: 2,
  power: 3,
  hp: 3,
  arena: 'ground',
} as const satisfies UnitDefinition;

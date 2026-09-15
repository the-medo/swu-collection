import type { UnitDefinition } from '../definition.ts';

// LOF 93. Printed text is pinned in the meta foundation fixture.
export const gungiFindingHimself = {
  cardId: 'gungi--finding-himself',
  name: 'Gungi, Finding Himself',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Force', 'Jedi', 'Wookiee'],
  unique: true,
  cost: 2,
  power: 2,
  hp: 5,
  arena: 'ground',
} as const satisfies UnitDefinition;

import type { UnitDefinition } from '../definition.ts';

// ASH 094. V8 §7.7.12g keeps doubled tokens on their already chosen recipients.
export const moffJerjerrodWeShallRedoubleOurEfforts = {
  cardId: 'moff-jerjerrod--we-shall-redouble-our-efforts',
  name: 'Moff Jerjerrod, We Shall Redouble Our Efforts',
  kind: 'unit',
  aspects: ['Command', 'Villainy'],
  traits: ['Imperial', 'Official'],
  unique: true,
  cost: 2,
  power: 1,
  hp: 3,
  arena: 'ground',
  doubleTokensBySelfDefeat: true,
} as const satisfies UnitDefinition;

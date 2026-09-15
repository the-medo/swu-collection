import type { UnitDefinition } from '../definition.ts';

// ASH 001. Printed text is pinned in the meta token fixture.
export const mandalorian = {
  cardId: 'mandalorian',
  name: 'Mandalorian',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Mandalorian'],
  cost: 0,
  power: 2,
  hp: 2,
  arena: 'ground',
  token: true,
  keywords: ['Shielded'],
} as const satisfies UnitDefinition;

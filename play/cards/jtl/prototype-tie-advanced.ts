import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 foundation fixture.
export const prototypeTieAdvanced = {
  cardId: 'prototype-tie-advanced',
  name: 'Prototype TIE Advanced',
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Imperial', 'Vehicle', 'Fighter'],
  cost: 3,
  power: 4,
  hp: 3,
  arena: 'space',
} as const satisfies UnitDefinition;

import type { UnitDefinition } from '../definition.ts';

export const tieLnFighter = {
  cardId: 'tie-ln-fighter',
  traits: ['Imperial', 'Vehicle', 'Fighter'],
  name: 'TIE/ln Fighter',
  kind: 'unit',
  cost: 1,
  power: 2,
  hp: 1,
  arena: 'space',
  aspects: ['Villainy'],
} as const satisfies UnitDefinition;

import type { UnitDefinition } from '../definition.ts';

// Created token units enter exhausted and cannot enter hidden zones.
export const tieFighter = {
  cardId: 'tie-fighter',
  name: 'TIE Fighter',
  kind: 'unit',
  token: true,
  aspects: ['Villainy'],
  traits: ['Vehicle', 'Fighter'],
  cost: 0,
  power: 1,
  hp: 1,
  arena: 'space',
} as const satisfies UnitDefinition;

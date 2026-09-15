import type { UnitDefinition } from '../definition.ts';

export const honorableNiteOwl = {
  cardId: 'honorable-nite-owl',
  name: 'Honorable Nite Owl',
  kind: 'unit',
  traits: ['Mandalorian', 'Trooper'],
  aspects: ['Aggression', 'Heroism'],
  cost: 2,
  power: 2,
  hp: 2,
  arena: 'ground',
  keywords: ['Support'],
  raid: 1,
} as const satisfies UnitDefinition;

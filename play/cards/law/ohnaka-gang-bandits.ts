import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-foundations.json.
export const ohnakaGangBandits = {
  cardId: 'ohnaka-gang-bandits',
  name: 'Ohnaka Gang Bandits',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Underworld'],
  cost: 7,
  power: 6,
  hp: 7,
  arena: 'ground',
  raid: 3,
} as const satisfies UnitDefinition;

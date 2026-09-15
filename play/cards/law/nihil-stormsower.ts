import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-foundations.json.
export const nihilStormsower = {
  cardId: 'nihil-stormsower',
  name: 'Nihil Stormsower',
  kind: 'unit',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Underworld', 'Nihil'],
  cost: 1,
  power: 2,
  hp: 2,
  arena: 'ground',
  keywords: ['Hidden'],
} as const satisfies UnitDefinition;

import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-foundations.json.
export const nihilMarauder = {
  cardId: 'nihil-marauder',
  name: 'Nihil Marauder',
  kind: 'unit',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Underworld', 'Trooper'],
  cost: 3,
  power: 1,
  hp: 5,
  arena: 'ground',
  raid: 3,
} as const satisfies UnitDefinition;

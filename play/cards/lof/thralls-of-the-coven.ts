import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-foundations.json.
export const thrallsOfTheCoven = {
  cardId: 'thralls-of-the-coven',
  name: 'Thralls of the Coven',
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Night'],
  cost: 5,
  power: 3,
  hp: 7,
  arena: 'ground',
  raid: 3,
} as const satisfies UnitDefinition;

import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-foundations.json.
export const wookieeGuerilla = {
  cardId: 'wookiee-guerilla',
  name: 'Wookiee Guerilla',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Wookiee', 'Trooper'],
  cost: 3,
  power: 2,
  hp: 4,
  arena: 'ground',
  keywords: ['Hidden'],
  raid: 2,
} as const satisfies UnitDefinition;

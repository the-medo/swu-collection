import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-foundations.json.
export const ohnakaGangStarhopper = {
  cardId: 'ohnaka-gang-starhopper',
  name: 'Ohnaka Gang Starhopper',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Underworld', 'Vehicle', 'Fighter'],
  cost: 2,
  power: 2,
  hp: 2,
  arena: 'space',
  keywords: ['Saboteur'],
} as const satisfies UnitDefinition;

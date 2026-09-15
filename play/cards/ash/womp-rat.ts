import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-foundations.json.
export const wompRat = {
  cardId: 'womp-rat',
  name: 'Womp Rat',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Creature'],
  cost: 1,
  power: 2,
  hp: 1,
  arena: 'ground',
  keywords: ['Hidden'],
} as const satisfies UnitDefinition;

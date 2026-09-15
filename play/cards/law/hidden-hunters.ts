import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-foundations.json.
export const hiddenHunters = {
  cardId: 'hidden-hunters',
  name: 'Hidden Hunters',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Bounty Hunter'],
  cost: 4,
  power: 4,
  hp: 5,
  arena: 'ground',
  keywords: ['Hidden'],
} as const satisfies UnitDefinition;

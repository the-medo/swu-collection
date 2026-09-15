import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-foundations.json.
export const inspiredRecruit = {
  cardId: 'inspired-recruit',
  name: 'Inspired Recruit',
  kind: 'unit',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Rebel', 'Trooper'],
  cost: 1,
  power: 3,
  hp: 1,
  arena: 'ground',
} as const satisfies UnitDefinition;

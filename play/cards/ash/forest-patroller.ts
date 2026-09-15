import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-foundations.json.
export const forestPatroller = {
  cardId: 'forest-patroller',
  name: 'Forest Patroller',
  kind: 'unit',
  aspects: ['Command', 'Villainy'],
  traits: ['Imperial', 'Trooper'],
  cost: 3,
  power: 3,
  hp: 4,
  arena: 'ground',
  keywords: ['Overwhelm'],
  restore: 1,
} as const satisfies UnitDefinition;

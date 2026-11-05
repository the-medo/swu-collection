import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteInfiltratingDemolisher = {
  cardId: 'infiltrating-demolisher',
  name: 'Infiltrating Demolisher',
  kind: 'unit',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Separatist', 'Droid'],
  cost: 4,
  power: 4,
  hp: 5,
  arena: 'ground',
  exploit: 1,
  keywords: ['Saboteur'],
} as const satisfies UnitDefinition;

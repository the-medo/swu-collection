import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteBrainInvaders = {
  cardId: 'brain-invaders',
  name: 'Brain Invaders',
  kind: 'unit',
  aspects: [],
  traits: ['Fringe'],
  cost: 4,
  power: 2,
  hp: 4,
  arena: 'ground',
  blankLeadersExceptEpic: true,
} as const satisfies UnitDefinition;

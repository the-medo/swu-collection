import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-foundations.json.
export const perideaBandit = {
  cardId: 'peridea-bandit',
  name: 'Peridea Bandit',
  kind: 'unit',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Fringe'],
  cost: 2,
  power: 4,
  hp: 1,
  arena: 'ground',
} as const satisfies UnitDefinition;

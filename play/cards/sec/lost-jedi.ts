import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-foundations.json.
export const lostJedi = {
  cardId: 'lost-jedi',
  name: 'Lost Jedi',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Force', 'Jedi'],
  cost: 2,
  power: 1,
  hp: 3,
  arena: 'ground',
  keywords: ['Grit'],
} as const satisfies UnitDefinition;

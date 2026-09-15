import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-foundations.json.
export const kowakianMonkeyLizard = {
  cardId: 'kowakian-monkey-lizard',
  name: 'Kowakian Monkey-Lizard',
  kind: 'unit',
  aspects: [],
  traits: ['Creature'],
  cost: 2,
  power: 2,
  hp: 1,
  arena: 'ground',
  keywords: ['Ambush'],
} as const satisfies UnitDefinition;

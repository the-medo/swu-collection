import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-foundations.json.
export const porg = {
  cardId: 'porg',
  name: 'Porg',
  kind: 'unit',
  aspects: [],
  traits: ['Creature'],
  cost: 0,
  power: 1,
  hp: 1,
  arena: 'ground',
} as const satisfies UnitDefinition;

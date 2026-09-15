import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-foundations.json.
export const vulptex = {
  cardId: 'vulptex',
  name: 'Vulptex',
  kind: 'unit',
  aspects: ['Heroism'],
  traits: ['Creature'],
  cost: 2,
  power: 3,
  hp: 2,
  arena: 'ground',
  keywords: ['Hidden'],
} as const satisfies UnitDefinition;

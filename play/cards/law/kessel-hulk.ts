import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-foundations.json.
export const kesselHulk = {
  cardId: 'kessel-hulk',
  name: 'Kessel Hulk',
  kind: 'unit',
  aspects: [],
  traits: ['Underworld', 'Vehicle', 'Transport'],
  cost: 7,
  power: 5,
  hp: 7,
  arena: 'space',
  keywords: ['Sentinel'],
} as const satisfies UnitDefinition;

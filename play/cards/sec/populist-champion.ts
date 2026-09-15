import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-foundations.json.
export const populistChampion = {
  cardId: 'populist-champion',
  name: 'Populist Champion',
  kind: 'unit',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['New Republic', 'Official'],
  cost: 3,
  power: 3,
  hp: 5,
  arena: 'ground',
} as const satisfies UnitDefinition;

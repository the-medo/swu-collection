import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-foundations.json.
export const rebelliousFunctionary = {
  cardId: 'rebellious-functionary',
  name: 'Rebellious Functionary',
  kind: 'unit',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Rebel', 'Official'],
  cost: 1,
  power: 2,
  hp: 2,
  arena: 'ground',
  keywords: ['Hidden'],
} as const satisfies UnitDefinition;

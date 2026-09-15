import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-foundations.json.
export const sithAssassin = {
  cardId: 'sith-assassin',
  name: 'Sith Assassin',
  kind: 'unit',
  aspects: ['Villainy'],
  traits: ['Force', 'Sith'],
  cost: 2,
  power: 3,
  hp: 2,
  arena: 'ground',
  keywords: ['Hidden'],
} as const satisfies UnitDefinition;

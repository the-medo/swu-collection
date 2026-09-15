import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-foundations.json.
export const awakenedSpecters = {
  cardId: 'awakened-specters',
  name: 'Awakened Specters',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Night'],
  cost: 4,
  power: 4,
  hp: 5,
  arena: 'ground',
} as const satisfies UnitDefinition;

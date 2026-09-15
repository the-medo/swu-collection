import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-foundations.json.
export const andoCommission = {
  cardId: 'ando-commission',
  name: 'Ando Commission',
  kind: 'unit',
  aspects: [],
  traits: ['Separatist', 'Official'],
  cost: 4,
  power: 4,
  hp: 3,
  arena: 'ground',
  keywords: ['Sentinel'],
} as const satisfies UnitDefinition;

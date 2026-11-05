import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetNiimaOutpostConstables = {
  cardId: 'niima-outpost-constables',
  name: 'Niima Outpost Constables',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Fringe'],
  cost: 4,
  power: 2,
  hp: 6,
  arena: 'ground',
  keywords: ['Sentinel'],
} as const satisfies UnitDefinition;

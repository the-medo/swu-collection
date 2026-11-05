import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetCellBlockGuard = {
  cardId: 'cell-block-guard',
  name: 'Cell Block Guard',
  kind: 'unit',
  aspects: ['Villainy'],
  traits: ['Imperial', 'Trooper'],
  cost: 3,
  power: 3,
  hp: 3,
  arena: 'ground',
  keywords: ['Sentinel'],
} as const satisfies UnitDefinition;

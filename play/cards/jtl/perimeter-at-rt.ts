import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-foundations.json.
export const perimeterAtRt = {
  cardId: 'perimeter-at-rt',
  name: 'Perimeter AT-RT',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Republic', 'Vehicle', 'Walker'],
  cost: 4,
  power: 3,
  hp: 5,
  arena: 'ground',
  keywords: ['Sentinel'],
} as const satisfies UnitDefinition;

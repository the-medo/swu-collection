import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-foundations.json.
export const omicronStrikeCraft = {
  cardId: 'omicron-strike-craft',
  name: 'Omicron Strike Craft',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Republic', 'Vehicle', 'Transport'],
  cost: 3,
  power: 2,
  hp: 3,
  arena: 'space',
  keywords: ['Sentinel'],
} as const satisfies UnitDefinition;

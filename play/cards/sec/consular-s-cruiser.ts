import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-foundations.json.
export const consularSCruiser = {
  cardId: 'consular-s-cruiser',
  name: "Consular's Cruiser",
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Republic', 'Vehicle', 'Transport'],
  cost: 5,
  power: 4,
  hp: 5,
  arena: 'space',
  keywords: ['Sentinel'],
} as const satisfies UnitDefinition;

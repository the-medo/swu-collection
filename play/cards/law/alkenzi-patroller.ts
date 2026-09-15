import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-foundations.json.
export const alkenziPatroller = {
  cardId: 'alkenzi-patroller',
  name: 'Alkenzi Patroller',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Imperial', 'Vehicle', 'Fighter'],
  cost: 2,
  power: 2,
  hp: 1,
  arena: 'space',
  keywords: ['Sentinel'],
} as const satisfies UnitDefinition;

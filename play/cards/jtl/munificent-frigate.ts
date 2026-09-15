import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-foundations.json.
export const munificentFrigate = {
  cardId: 'munificent-frigate',
  name: 'Munificent Frigate',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Separatist', 'Vehicle', 'Capital Ship'],
  cost: 5,
  power: 4,
  hp: 7,
  arena: 'space',
} as const satisfies UnitDefinition;

import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-foundations.json.
export const remnantOfficial = {
  cardId: 'remnant-official',
  name: 'Remnant Official',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Imperial', 'Official'],
  cost: 3,
  power: 3,
  hp: 3,
  arena: 'ground',
  restore: 2,
} as const satisfies UnitDefinition;

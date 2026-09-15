import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-foundations.json.
export const longbeamCruiser = {
  cardId: 'longbeam-cruiser',
  name: 'Longbeam Cruiser',
  kind: 'unit',
  aspects: ['Heroism'],
  traits: ['Republic', 'Vehicle', 'Capital Ship'],
  cost: 6,
  power: 6,
  hp: 6,
  arena: 'space',
  restore: 1,
} as const satisfies UnitDefinition;

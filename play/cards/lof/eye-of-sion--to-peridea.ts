import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-foundations.json.
export const eyeOfSionToPeridea = {
  cardId: 'eye-of-sion--to-peridea',
  name: 'Eye of Sion, To Peridea',
  kind: 'unit',
  aspects: ['Command', 'Villainy'],
  traits: ['Imperial', 'Vehicle', 'Transport'],
  unique: true,
  cost: 6,
  power: 4,
  hp: 7,
  arena: 'space',
  keywords: ['Hidden', 'Ambush', 'Overwhelm'],
  restore: 1,
} as const satisfies UnitDefinition;

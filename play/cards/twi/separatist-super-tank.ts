import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteSeparatistSuperTank = {
  cardId: 'separatist-super-tank',
  name: 'Separatist Super Tank',
  kind: 'unit',
  aspects: ['Command', 'Villainy'],
  traits: ['Separatist', 'Vehicle', 'Tank'],
  cost: 9,
  power: 8,
  hp: 8,
  arena: 'ground',
  exploit: 3,
} as const satisfies UnitDefinition;

import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetAtSt = {
  cardId: 'at-st',
  name: 'AT-ST',
  kind: 'unit',
  aspects: ['Villainy'],
  traits: ['Imperial', 'Vehicle', 'Walker'],
  cost: 6,
  power: 6,
  hp: 7,
  arena: 'ground',
  keywords: ['Overwhelm'],
} as const satisfies UnitDefinition;

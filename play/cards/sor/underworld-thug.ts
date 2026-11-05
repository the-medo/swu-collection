import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetUnderworldThug = {
  cardId: 'underworld-thug',
  name: 'Underworld Thug',
  kind: 'unit',
  aspects: [],
  traits: ['Underworld'],
  cost: 2,
  power: 2,
  hp: 3,
  arena: 'ground',
} as const satisfies UnitDefinition;

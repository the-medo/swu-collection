import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetSundariPeacekeeper = {
  cardId: 'sundari-peacekeeper',
  name: 'Sundari Peacekeeper',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Mandalorian', 'Trooper'],
  cost: 3,
  power: 1,
  hp: 5,
  arena: 'ground',
  raid: 2,
  restore: 2,
} as const satisfies UnitDefinition;

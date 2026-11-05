import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetWildernessFighter = {
  cardId: 'wilderness-fighter',
  name: 'Wilderness Fighter',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Trooper'],
  cost: 3,
  power: 2,
  hp: 4,
  arena: 'ground',
  keywords: ['Shielded'],
} as const satisfies UnitDefinition;

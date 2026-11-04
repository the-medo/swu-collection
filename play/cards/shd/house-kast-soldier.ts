import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetHouseKastSoldier = {
  cardId: 'house-kast-soldier',
  name: 'House Kast Soldier',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Mandalorian', 'Trooper'],
  cost: 2,
  power: 2,
  hp: 3,
  arena: 'ground',
  keywords: ['Saboteur'],
} as const satisfies UnitDefinition;

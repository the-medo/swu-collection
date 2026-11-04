import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetScoutBikePursuer = {
  cardId: 'scout-bike-pursuer',
  name: 'Scout Bike Pursuer',
  kind: 'unit',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Imperial', 'Trooper'],
  cost: 2,
  power: 1,
  hp: 4,
  arena: 'ground',
  keywords: ['Grit'],
} as const satisfies UnitDefinition;

import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetDeathWatchLoyalist = {
  cardId: 'death-watch-loyalist',
  name: 'Death Watch Loyalist',
  kind: 'unit',
  aspects: ['Villainy', 'Aggression'],
  traits: ['Mandalorian', 'Trooper'],
  cost: 3,
  power: 3,
  hp: 3,
  arena: 'ground',
  keywords: ['Grit', 'Overwhelm'],
} as const satisfies UnitDefinition;

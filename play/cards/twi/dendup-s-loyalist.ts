import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetDendupSLoyalist = {
  cardId: 'dendup-s-loyalist',
  name: "Dendup's Loyalist",
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Fringe', 'Trooper'],
  cost: 2,
  power: 2,
  hp: 3,
  arena: 'ground',
  keywords: ['Overwhelm'],
} as const satisfies UnitDefinition;

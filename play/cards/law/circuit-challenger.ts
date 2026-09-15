import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-foundations.json.
export const circuitChallenger = {
  cardId: 'circuit-challenger',
  name: 'Circuit Challenger',
  kind: 'unit',
  aspects: ['Heroism'],
  traits: ['Vehicle', 'Speeder'],
  cost: 5,
  power: 4,
  hp: 5,
  arena: 'ground',
  keywords: ['Ambush'],
} as const satisfies UnitDefinition;

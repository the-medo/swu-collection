import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-foundations.json.
export const rebelPathfinder = {
  cardId: 'rebel-pathfinder',
  name: 'Rebel Pathfinder',
  kind: 'unit',
  aspects: ['Heroism'],
  traits: ['Rebel', 'Trooper'],
  cost: 2,
  power: 2,
  hp: 3,
  arena: 'ground',
  keywords: ['Saboteur'],
} as const satisfies UnitDefinition;

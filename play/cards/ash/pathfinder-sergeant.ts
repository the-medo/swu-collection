import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-foundations.json.
export const pathfinderSergeant = {
  cardId: 'pathfinder-sergeant',
  name: 'Pathfinder Sergeant',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Rebel', 'Trooper'],
  cost: 2,
  power: 2,
  hp: 3,
  arena: 'ground',
  keywords: ['Ambush'],
  restore: 1,
} as const satisfies UnitDefinition;

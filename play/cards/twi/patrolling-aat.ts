import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetPatrollingAat = {
  cardId: 'patrolling-aat',
  name: 'Patrolling AAT',
  kind: 'unit',
  aspects: ['Villainy'],
  traits: ['Separatist', 'Vehicle', 'Tank'],
  cost: 5,
  power: 4,
  hp: 5,
  arena: 'ground',
  keywords: ['Sentinel'],
} as const satisfies UnitDefinition;

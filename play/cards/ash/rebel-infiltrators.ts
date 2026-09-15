import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-foundations.json.
export const rebelInfiltrators = {
  cardId: 'rebel-infiltrators',
  name: 'Rebel Infiltrators',
  kind: 'unit',
  aspects: ['Heroism'],
  traits: ['Rebel', 'Trooper'],
  cost: 5,
  power: 4,
  hp: 6,
  arena: 'ground',
  keywords: ['Saboteur'],
  restore: 1,
} as const satisfies UnitDefinition;

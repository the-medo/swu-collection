import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-foundations.json.
export const chargingPhillak = {
  cardId: 'charging-phillak',
  name: 'Charging Phillak',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Creature'],
  cost: 4,
  power: 3,
  hp: 4,
  arena: 'ground',
  keywords: ['Ambush', 'Hidden'],
} as const satisfies UnitDefinition;

import type { UnitDefinition } from '../definition.ts';

export const battlefieldMarine = {
  cardId: 'battlefield-marine',
  traits: ['Rebel', 'Trooper'],
  name: 'Battlefield Marine',
  kind: 'unit',
  cost: 2,
  power: 3,
  hp: 3,
  arena: 'ground',
  aspects: ['Command', 'Heroism'],
} as const satisfies UnitDefinition;

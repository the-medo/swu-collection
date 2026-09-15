import type { UnitDefinition } from '../definition.ts';

export const cloneTrooper = {
  cardId: 'clone-trooper',
  name: 'Clone Trooper',
  kind: 'unit',
  token: true,
  cost: 0,
  power: 2,
  hp: 2,
  arena: 'ground',
  aspects: ['Heroism'],
  traits: ['Republic', 'Clone', 'Trooper'],
} as const satisfies UnitDefinition;

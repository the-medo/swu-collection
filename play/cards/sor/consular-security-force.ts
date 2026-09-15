import type { UnitDefinition } from '../definition.ts';

export const consularSecurityForce = {
  cardId: 'consular-security-force',
  traits: ['Rebel', 'Trooper'],
  name: 'Consular Security Force',
  kind: 'unit',
  cost: 4,
  power: 3,
  hp: 7,
  arena: 'ground',
  aspects: ['Vigilance', 'Heroism'],
} as const satisfies UnitDefinition;

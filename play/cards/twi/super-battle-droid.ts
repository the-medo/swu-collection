import type { UnitDefinition } from '../definition.ts';

// Reprinted in IC27 180; identity and text follow the official catalog.
export const ic27ReprintSuperBattleDroid = {
  cardId: 'super-battle-droid',
  name: 'Super Battle Droid',
  kind: 'unit',
  aspects: ['Villainy'],
  traits: ['Separatist', 'Droid', 'Trooper'],
  cost: 3,
  power: 4,
  hp: 3,
  arena: 'ground',
} as const satisfies UnitDefinition;

import type { UnitDefinition } from '../definition.ts';

// Token reprints share this canonical identity. Created units enter exhausted.
export const battleDroid = {
  cardId: 'battle-droid',
  name: 'Battle Droid',
  kind: 'unit',
  token: true,
  aspects: ['Villainy'],
  traits: ['Separatist', 'Droid', 'Trooper'],
  cost: 0,
  power: 1,
  hp: 1,
  arena: 'ground',
} as const satisfies UnitDefinition;

import type { UnitDefinition } from '../definition.ts';

// Reprinted in IC27 173; identity and text follow the official catalog.
export const ic27ReprintHiddenSharpshooter = {
  cardId: 'hidden-sharpshooter',
  name: 'Hidden Sharpshooter',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Republic', 'Clone', 'Trooper'],
  cost: 4,
  power: 4,
  hp: 3,
  arena: 'ground',
  keywords: ['Ambush'],
} as const satisfies UnitDefinition;

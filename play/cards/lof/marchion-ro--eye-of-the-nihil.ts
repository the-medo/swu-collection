import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-attributes.json.
export const marchionRoEyeOfTheNihil = {
  cardId: 'marchion-ro--eye-of-the-nihil',
  name: 'Marchion Ro, Eye of the Nihil',
  kind: 'unit',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Underworld'],
  unique: true,
  cost: 6,
  power: 6,
  hp: 7,
  arena: 'ground',
  friendlyRaidMultiplier: 2,
} as const satisfies UnitDefinition;

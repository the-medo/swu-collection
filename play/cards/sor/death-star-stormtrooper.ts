import type { UnitDefinition } from '../definition.ts';

export const deathStarStormtrooper = {
  cardId: 'death-star-stormtrooper',
  traits: ['Imperial', 'Trooper'],
  name: 'Death Star Stormtrooper',
  kind: 'unit',
  cost: 1,
  power: 3,
  hp: 1,
  arena: 'ground',
  aspects: ['Aggression', 'Villainy'],
} as const satisfies UnitDefinition;

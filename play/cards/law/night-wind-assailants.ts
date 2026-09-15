import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 foundation fixture.
export const nightWindAssailants = {
  cardId: 'night-wind-assailants',
  name: 'Night Wind Assailants',
  kind: 'unit',
  aspects: ['Villainy'],
  traits: ['Underworld'],
  cost: 5,
  power: 5,
  hp: 5,
  arena: 'ground',
  keywords: ['Sentinel'],
} as const satisfies UnitDefinition;

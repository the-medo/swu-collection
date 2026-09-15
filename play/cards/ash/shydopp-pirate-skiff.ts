import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 foundation fixture.
export const shydoppPirateSkiff = {
  cardId: 'shydopp-pirate-skiff',
  name: 'Shydopp Pirate Skiff',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Underworld', 'Vehicle', 'Transport'],
  cost: 4,
  power: 4,
  hp: 5,
  arena: 'ground',
  keywords: ['Saboteur'],
} as const satisfies UnitDefinition;

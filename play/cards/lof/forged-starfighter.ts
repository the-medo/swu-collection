import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 foundation fixture.
export const forgedStarfighter = {
  cardId: 'forged-starfighter',
  name: 'Forged Starfighter',
  kind: 'unit',
  aspects: ['Villainy'],
  traits: ['Sith', 'Vehicle', 'Fighter'],
  cost: 1,
  power: 1,
  hp: 1,
  arena: 'space',
  keywords: ['Hidden'],
  raid: 1,
} as const satisfies UnitDefinition;

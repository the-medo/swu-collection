import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 foundation fixture.
export const strikeship = {
  cardId: 'strikeship',
  name: 'Strikeship',
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Underworld', 'Vehicle', 'Fighter'],
  cost: 2,
  power: 0,
  hp: 3,
  arena: 'space',
  keywords: ['Overwhelm'],
  raid: 3,
} as const satisfies UnitDefinition;

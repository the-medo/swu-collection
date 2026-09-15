import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 foundation fixture.
export const orbitingKWing = {
  cardId: 'orbiting-k-wing',
  name: 'Orbiting K-Wing',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Vehicle', 'Fighter'],
  cost: 4,
  power: 4,
  hp: 4,
  arena: 'space',
  keywords: ['Saboteur'],
} as const satisfies UnitDefinition;

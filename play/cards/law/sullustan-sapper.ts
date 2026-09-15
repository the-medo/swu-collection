import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 foundation fixture.
export const sullustanSapper = {
  cardId: 'sullustan-sapper',
  name: 'Sullustan Sapper',
  kind: 'unit',
  aspects: ['Aggression', 'Cunning'],
  traits: ['Underworld'],
  cost: 3,
  power: 4,
  hp: 2,
  arena: 'ground',
  keywords: ['Ambush', 'Overwhelm'],
} as const satisfies UnitDefinition;

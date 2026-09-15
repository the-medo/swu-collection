import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 conditional ability fixture.
export const defendersOfTheForest = {
  cardId: 'defenders-of-the-forest',
  name: 'Defenders of the Forest',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Ewok'],
  cost: 5,
  power: 5,
  hp: 3,
  arena: 'ground',
  keywords: ['Ambush', 'Overwhelm'],
} as const satisfies UnitDefinition;

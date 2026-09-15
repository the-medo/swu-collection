import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 foundation fixture.
export const rebelBlockadeRunner = {
  cardId: 'rebel-blockade-runner',
  name: 'Rebel Blockade Runner',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Rebel', 'Vehicle', 'Transport'],
  cost: 4,
  power: 4,
  hp: 5,
  arena: 'space',
  keywords: ['Saboteur'],
} as const satisfies UnitDefinition;

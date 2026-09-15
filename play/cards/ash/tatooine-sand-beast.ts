import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 foundation fixture.
export const tatooineSandBeast = {
  cardId: 'tatooine-sand-beast',
  name: 'Tatooine Sand Beast',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Creature'],
  cost: 6,
  power: 8,
  hp: 4,
  arena: 'ground',
  keywords: ['Hidden'],
} as const satisfies UnitDefinition;

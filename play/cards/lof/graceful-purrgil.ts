import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 foundation fixture.
export const gracefulPurrgil = {
  cardId: 'graceful-purrgil',
  name: 'Graceful Purrgil',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Creature'],
  cost: 5,
  power: 2,
  hp: 7,
  arena: 'space',
  keywords: ['Sentinel'],
} as const satisfies UnitDefinition;

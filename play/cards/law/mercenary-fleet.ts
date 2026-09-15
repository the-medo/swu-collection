import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 foundation fixture.
export const mercenaryFleet = {
  cardId: 'mercenary-fleet',
  name: 'Mercenary Fleet',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Underworld', 'Vehicle', 'Fighter', 'Transport'],
  cost: 9,
  power: 10,
  hp: 10,
  arena: 'space',
} as const satisfies UnitDefinition;

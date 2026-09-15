import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 foundation fixture.
export const mosEisleyModifier = {
  cardId: 'mos-eisley-modifier',
  name: 'Mos Eisley Modifier',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Fringe'],
  cost: 3,
  power: 1,
  hp: 4,
  arena: 'ground',
  keywords: ['Support', 'Grit'],
} as const satisfies UnitDefinition;

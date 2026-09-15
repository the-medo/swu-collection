import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 foundation fixture.
export const shinHatiOvereagerApprentice = {
  cardId: 'shin-hati--overeager-apprentice',
  name: 'Shin Hati, Overeager Apprentice',
  kind: 'unit',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Force', 'Fringe'],
  unique: true,
  cost: 3,
  power: 4,
  hp: 2,
  arena: 'ground',
  keywords: ['Hidden', 'Shielded'],
} as const satisfies UnitDefinition;

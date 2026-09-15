import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 turn and round fixture.
export const maxReboEncore = {
  cardId: 'max-rebo--encore-',
  name: 'Max Rebo, Encore!',
  kind: 'unit',
  aspects: ['Command', 'Cunning'],
  traits: ['Underworld', 'Musician'],
  unique: true,
  cost: 4,
  power: 2,
  hp: 7,
  arena: 'ground',
  extraRegroups: 1,
} as const satisfies UnitDefinition;

import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 foundation fixture.
export const toydarianTechnician = {
  cardId: 'toydarian-technician',
  name: 'Toydarian Technician',
  kind: 'unit',
  aspects: ['Cunning', 'Vigilance'],
  traits: ['Underworld'],
  cost: 2,
  power: 2,
  hp: 3,
  arena: 'ground',
  raid: 1,
  restore: 1,
} as const satisfies UnitDefinition;

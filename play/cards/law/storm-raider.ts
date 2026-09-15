import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 foundation fixture.
export const stormRaider = {
  cardId: 'storm-raider',
  name: 'Storm Raider',
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Underworld', 'Nihil'],
  cost: 1,
  power: 2,
  hp: 2,
  arena: 'ground',
  raid: 1,
} as const satisfies UnitDefinition;

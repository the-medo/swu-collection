import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 foundation fixture.
export const lobotCloudCityCoordinator = {
  cardId: 'lobot--cloud-city-coordinator',
  name: 'Lobot, Cloud City Coordinator',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Fringe'],
  unique: true,
  cost: 2,
  power: 0,
  hp: 4,
  arena: 'ground',
  keywords: ['Sentinel', 'Grit'],
} as const satisfies UnitDefinition;
